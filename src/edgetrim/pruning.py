import torch
import torch.nn.functional as F
from torch_geometric.utils import dropout_edge


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


def random_prune_connections(edge_index, connections_to_keep: int, seed: int):
    """Keep an exact random sample of undirected, non-self-loop connections."""
    edges = edge_index.cpu()
    source, target = edges
    num_nodes = int(edges.max()) + 1

    one_direction = source < target
    u = source[one_direction]
    v = target[one_direction]
    if not 0 <= connections_to_keep <= u.numel():
        raise ValueError(
            f"connections_to_keep must be between 0 and {u.numel()}, "
            f"got {connections_to_keep}"
        )

    generator = torch.Generator(device="cpu")
    generator.manual_seed(seed)
    selected = torch.randperm(u.numel(), generator=generator)[:connections_to_keep]
    kept_keys = u[selected] * num_nodes + v[selected]

    a = torch.minimum(source, target)
    b = torch.maximum(source, target)
    keep_mask = (source == target) | torch.isin(a * num_nodes + b, kept_keys)
    return edge_index[:, keep_mask.to(edge_index.device)]

def degree_prune_edges(edge_index, connections_to_keep: int):
    edges = edge_index.cpu()
    source, target = edges
    num_nodes = int(edges.max()) + 1

    one_direction = source < target
    u = source[one_direction]
    v = target[one_direction]
    degrees = torch.bincount(source, minlength=num_nodes)
    scores = 1.0 / degrees[u].float() + 1.0 / degrees[v].float()

    selected = torch.argsort(scores, descending=True, stable=True)[:connections_to_keep]
    kept_keys = u[selected] * num_nodes + v[selected]

    a = torch.minimum(source, target)
    b = torch.maximum(source, target)
    keep_mask = torch.isin(a * num_nodes + b, kept_keys)

    return edge_index[:, keep_mask.to(edge_index.device)]


def feature_similarity_prune_edges(edge_index, node_features, connections_to_keep: int, chunk_size: int = 100_000):
    edges = edge_index.cpu()
    features = node_features.detach().cpu().float()

    source, target = edges
    num_nodes = features.size(0)

    one_direction = source < target
    u = source[one_direction]
    v = target[one_direction]

    normalized_features = F.normalize(features, p=2, dim=1)

    score_chunks = []
    for start in range(0, u.numel(), chunk_size):
        end = min(start + chunk_size, u.numel())

        chunk_scores = (
            normalized_features[u[start:end]]
            * normalized_features[v[start:end]]
        ).sum(dim=1)

        score_chunks.append(chunk_scores)

    scores = torch.cat(score_chunks)

    selected = torch.argsort(scores, descending=True, stable=True)[:connections_to_keep]

    kept_keys = u[selected] * num_nodes + v[selected]

    a = torch.minimum(source, target)
    b = torch.maximum(source, target)
    connection_keys = a * num_nodes + b

    keep_mask = torch.isin(connection_keys, kept_keys)
    return edge_index[:, keep_mask.to(edge_index.device)]

def teacher_gradient_connection_scores(teacher, node_features, edge_index, labels, train_indices):
    teacher.eval()
    teacher.requires_grad_(False)

    source, target = edge_index
    num_nodes = node_features.size(0)

    a = torch.minimum(source,target)
    b = torch.maximum(source, target)
    directed_connection_keys = a * num_nodes + b

    connection_keys, inverse = torch.unique(
        directed_connection_keys,
        sorted=True,
        return_inverse=True
    )

    connection_gates = torch.ones(
        connection_keys.numel(),
        device=edge_index.device,
        requires_grad=True
    )

    edge_weight = connection_gates[inverse]

    logits = teacher(node_features, edge_index, edge_weight=edge_weight)
    teacher_loss = F.cross_entropy(logits[train_indices], labels[train_indices])

    gate_gradients = torch.autograd.grad(
        teacher_loss,
        connection_gates
    )[0]

    connection_scores = (
        connection_gates * gate_gradients
    ).abs().detach()

    return connection_keys, connection_scores, float(teacher_loss.detach())


def select_connections_by_score(edge_index, connection_keys, connection_scores, connections_to_keep, num_nodes):
    selected = torch.argsort(connection_scores, descending=True, stable=True)[:connections_to_keep]

    kept_keys = connection_keys[selected]
    kept_scores = connection_scores[selected]

    source, target = edge_index
    a = torch.minimum(source, target)
    b = torch.maximum(source, target)
    directed_connection_keys = a * num_nodes + b

    keep_mask = torch.isin(
        directed_connection_keys,
        kept_keys
    )

    pruned_edge_index = edge_index[:, keep_mask]
    return pruned_edge_index, kept_keys, kept_scores