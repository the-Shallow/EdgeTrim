import torch.nn.functional as F
from torch import nn
from torch_geometric.nn import GCNConv


class GCN(nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int, out_channels: int, dropout: float = 0.5):
        super().__init__()
        self.conv1 = GCNConv(in_channels, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, out_channels)
        self.dropout = dropout

    def forward(self, x, edge_index, edge_weight = None):
        x = self.conv1(x, edge_index, edge_weight=edge_weight)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        return self.conv2(x, edge_index, edge_weight=edge_weight)


class OGBGCN(nn.Module):
    """OGB-style multi-layer GCN with BatchNorm on hidden layers."""

    def __init__(
        self,
        in_channels: int,
        hidden_channels: int,
        out_channels: int,
        num_layers: int = 3,
        dropout: float = 0.5,
    ):
        super().__init__()
        if num_layers < 2:
            raise ValueError("num_layers must be at least 2")

        self.convs = nn.ModuleList()
        self.convs.append(GCNConv(in_channels, hidden_channels))
        for _ in range(num_layers - 2):
            self.convs.append(GCNConv(hidden_channels, hidden_channels))
        self.convs.append(GCNConv(hidden_channels, out_channels))

        self.batch_norms = nn.ModuleList(
            nn.BatchNorm1d(hidden_channels)
            for _ in range(num_layers - 1)
        )
        self.dropout = dropout

    def forward(self, x, edge_index, edge_weight=None):
        for convolution, batch_norm in zip(
            self.convs[:-1],
            self.batch_norms,
        ):
            x = convolution(x, edge_index, edge_weight=edge_weight)
            x = batch_norm(x)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)

        return self.convs[-1](
            x,
            edge_index,
            edge_weight=edge_weight,
        )


def build_model(
    architecture: str,
    in_channels: int,
    hidden_channels: int,
    out_channels: int,
    dropout: float,
    num_layers: int = 2,
):
    if architecture == "gcn_2layer":
        return GCN(
            in_channels=in_channels,
            hidden_channels=hidden_channels,
            out_channels=out_channels,
            dropout=dropout,
        )
    if architecture == "ogb_gcn":
        return OGBGCN(
            in_channels=in_channels,
            hidden_channels=hidden_channels,
            out_channels=out_channels,
            num_layers=num_layers,
            dropout=dropout,
        )
    raise ValueError(f"Unknown model architecture: {architecture}")


def build_model_from_config(config, in_channels: int, out_channels: int):
    """Build new and legacy checkpoints using their saved configuration."""
    return build_model(
        architecture=config.get("model_architecture", "gcn_2layer"),
        in_channels=in_channels,
        hidden_channels=config["hidden_channels"],
        out_channels=out_channels,
        dropout=config["dropout"],
        num_layers=config.get("num_layers", 2),
    )
