from pathlib import Path

from torch_geometric.datasets import Planetoid
from ogb.nodeproppred import PygNodePropPredDataset

def load_cora(root: str | Path = "data/cora"):
    dataset = Planetoid(root=str(root), name="Cora", split="public")
    return dataset[0]


def load_ogbn_arxiv(root: str | Path = "data/ogbn-arxiv"):
    dataset = PygNodePropPredDataset(name="ogbn-arxiv", root=str(root))
    data = dataset[0]
    split = dataset.get_idx_split()
    return data, split
