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