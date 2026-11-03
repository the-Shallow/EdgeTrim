import torch
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
