from pathlib import Path
import copy
import torch
import torch.nn.functional as F

from edgetrim.data import load_cora
from edgetrim.model import GCN
from edgetrim.pruning import degree_prune_edges

torch.manual_seed(0)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

run_dir = Path("runs/cora_degree_seed0")
run_dir.mkdir(parents=True, exist_ok=True)

@torch.no_grad()
def accuracy(model, data, mask):
    model.eval()
    logits = model(data.x, data.edge_index)
    predictions = logits.argmax(dim=1)
    return (predictions[mask] == data.y[mask]).float().mean().item()


data = load_cora().to(device)
original_edges = data.num_edges
data.edge_index = degree_prune_edges(data.edge_index, connections_to_keep=3129)
print(f"edges: {original_edges} -> {data.num_edges}")
model = GCN(
    in_channels=data.num_features,
    hidden_channels=128,
    out_channels=int(data.y.max()) + 1
).to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=0.0005)

# model.train()
# optimizer.zero_grad()
# logits = model(data.x, data.edge_index)
# loss = F.cross_entropy(logits[data.train_mask], data.y[data.train_mask])
# loss.backward()
# optimizer.step()


# print(f"device = {device}, first_epoch_loss={loss.item()}")

best_val_accuracy = -1.0
best_epoch = 0
best_state = None
patience = 50

for epoch in range(1, 301):
    model.train()
    optimizer.zero_grad()

    logits = model(data.x, data.edge_index)
    loss = F.cross_entropy(logits[data.train_mask], data.y[data.train_mask])
    loss.backward()
    optimizer.step()

    val_accuracy = accuracy(model, data, data.val_mask)

    if val_accuracy > best_val_accuracy:
        best_val_accuracy = val_accuracy
        best_epoch = epoch
        best_state = copy.deepcopy(model.state_dict())

    print(f"epoch={epoch}, loss={loss.item():.4f}, val_accuracy={val_accuracy:.4f}")

    if epoch - best_epoch >= patience:
        break    


model.load_state_dict(best_state)
print(f"best_epoch={best_epoch}, best_val_accuracy={best_val_accuracy:.4f}")

test_accuracy = accuracy(model, data, data.test_mask)
print(f"test_accuracy={test_accuracy:.4f}")

torch.save(
    {
        "model_state_dict": model.state_dict(),
        "seed": 0,
        "best_epoch": best_epoch,
        "validation_accuracy": best_val_accuracy,
        "test_accuracy": test_accuracy,
        "hidden_channels": 128,
        "dropout": 0.5,
        "removal_fraction_actual": 1 - data.num_edges / original_edges,
        "edges_kept": data.num_edges,
        "pruning_method": "inverse_endpoint_degree",
    },
    run_dir / "checkpoint.pt"
)
