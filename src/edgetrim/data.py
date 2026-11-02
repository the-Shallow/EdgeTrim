from pathlib import Path

import torch
from torch_geometric.data.data import DataEdgeAttr, DataTensorAttr
from torch_geometric.data.storage import GlobalStorage
from torch_geometric.datasets import Planetoid
from torch_geometric.utils import to_undirected
from ogb.nodeproppred import PygNodePropPredDataset

def load_cora(root: str | Path = "data/cora"):
    dataset = Planetoid(root=str(root), name="Cora", split="public")
    return dataset[0]


def load_ogbn_arxiv(root: str | Path = "data/ogbn-arxiv"):
    # OGB reloads its processed file with torch.load, which defaults to weights_only=True
    # since PyTorch 2.6 and rejects PyG's storage classes unless they are allowlisted.
    with torch.serialization.safe_globals([DataEdgeAttr, DataTensorAttr, GlobalStorage]):
        dataset = PygNodePropPredDataset(name="ogbn-arxiv", root=str(root))
    data = dataset[0]
    split = dataset.get_idx_split()

    # Citation edges are directed; treat each citation as an undirected connection
    # and coalesce duplicates so arxiv follows the same conventions as Cora.
    data.directed_edges = data.edge_index.size(1)
    data.edge_index = to_undirected(data.edge_index, num_nodes=data.num_nodes)
    data.y = data.y.squeeze(1)

    for mask_name, split_name in [("train_mask", "train"), ("val_mask", "valid"), ("test_mask", "test")]:
        mask = torch.zeros(data.num_nodes, dtype=torch.bool)
        mask[split[split_name]] = True
        data[mask_name] = mask

    return data


def load_dataset(name: str, root: str | Path):
    if name == "cora":
        return load_cora(root)
    if name == "ogbn-arxiv":
        return load_ogbn_arxiv(root)
    raise ValueError(f"unknown dataset: {name}")
