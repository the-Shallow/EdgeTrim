"""Download and inspect ogbn-arxiv before submitting a GPU training job."""

import argparse

from edgetrim.data import load_ogbn_arxiv


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="data/ogbn-arxiv")
    args = parser.parse_args()

    data, split = load_ogbn_arxiv(args.root)
    print(f"dataset=ogbn-arxiv root={args.root}")
    print(f"nodes={data.num_nodes}")
    print(f"directed_edges={data.edge_index.size(1)}")
    print(f"features={data.num_features}")
    print(f"classes={int(data.y.max()) + 1}")
    print(f"train_nodes={split['train'].numel()}")
    print(f"valid_nodes={split['valid'].numel()}")
    print(f"test_nodes={split['test'].numel()}")


if __name__ == "__main__":
    main()
