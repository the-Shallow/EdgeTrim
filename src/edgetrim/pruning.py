import torch
import torch.nn.functional as F
from torch_geometric.utils import degree, dropout_edge, to_undirected


def random_prune_edges(edge_index, removal_fraction: float, seed:int):

    devices = [edge_index.device.index] if edge_index.is_cuda else []
    with torch.random.fork_rng(devices=devices):
        torch.manual_seed(seed)
        pruned_edge_index, _ = dropout_edge(
            edge_index,
            p = removal_fraction,
            force_undirected=True,
        )

    return pruned_edge_index


# The functions below prune at an exact budget. Every method scores each undirected
# connection once (self-loops excluded; GCNConv adds its own), keeps the highest
# scores, and mirrors the kept connections back into both directions.

def undirected_pairs(edge_index, num_nodes: int):
    """Unique undirected connections as a 2 x M tensor with src < dst."""
    row, col = edge_index
    not_loop = row != col
    low = torch.minimum(row[not_loop], col[not_loop])
    high = torch.maximum(row[not_loop], col[not_loop])
    keys = torch.unique(low * num_nodes + high)
    return torch.stack([keys // num_nodes, keys % num_nodes])


def pairs_to_edge_index(pairs, num_nodes: int):
    return to_undirected(pairs, num_nodes=num_nodes)


def select_pairs(scores, removal_fraction: float, seed: int):
    """Indices of the round((1 - removal_fraction) * M) highest-scoring pairs.

    Ties are broken by a seeded random permutation drawn on the CPU, so the same
    seed selects the same edges on any device.
    """
    num_pairs = scores.numel()
    num_keep = round((1 - removal_fraction) * num_pairs)
    generator = torch.Generator().manual_seed(seed)
    order = torch.randperm(num_pairs, generator=generator).to(scores.device)
    ranked = order[torch.argsort(scores[order], descending=True, stable=True)]
    return ranked[:num_keep].sort().values


def random_scores(pairs, seed: int):
    generator = torch.Generator().manual_seed(seed)
    return torch.rand(pairs.size(1), generator=generator).to(pairs.device)


def degree_scores(pairs, num_nodes: int):
    # GCN normalization weight 1 / sqrt(d_u * d_v): connections between two
    # high-degree nodes are removed first, so low-degree nodes keep their neighbors.
    deg = degree(pairs.flatten(), num_nodes)
    return (deg[pairs[0]] * deg[pairs[1]]).rsqrt()


def feature_similarity_scores(pairs, x):
    return F.cosine_similarity(x[pairs[0]], x[pairs[1]], dim=1)


def teacher_gradient_scores(teacher, x, pairs):
    """First-order estimate of how much removing each connection hurts the teacher.

    Every directed edge gets a weight of 1. The loss is the teacher's cross-entropy
    against its own predictions on all nodes, so no validation or test labels are
    used. Removing a connection sets both of its weights to 0, which changes the
    loss by about -(g_uv + g_vu); connections whose removal raises the loss most
    score highest.
    """
    num_pairs = pairs.size(1)
    edge_index = torch.cat([pairs, pairs.flip(0)], dim=1)
    edge_weight = torch.ones(edge_index.size(1), device=x.device, requires_grad=True)

    teacher.eval()
    logits = teacher(x, edge_index, edge_weight)
    loss = F.cross_entropy(logits, logits.argmax(dim=1))
    (grad,) = torch.autograd.grad(loss, edge_weight)
    return -(grad[:num_pairs] + grad[num_pairs:])


def score_edges(method: str, pairs, data, teacher=None, seed: int = 0):
    if method == "random":
        return random_scores(pairs, seed)
    if method == "degree":
        return degree_scores(pairs, data.num_nodes)
    if method == "feature_similarity":
        return feature_similarity_scores(pairs, data.x)
    if method == "teacher_gradient":
        return teacher_gradient_scores(teacher, data.x, pairs)
    raise ValueError(f"unknown pruning method: {method}")
