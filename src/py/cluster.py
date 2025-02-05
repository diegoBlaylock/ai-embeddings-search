import os
import sys
import torch
from pykeops.torch import LazyTensor
import pykeops

pykeops.set_verbose(False)


def cluster_vectors(num_clusters: int, vectors: torch.Tensor):
    """Adapted from https://www.kernel-operations.io/keops/_auto_tutorials/kmeans/plot_kmeans_torch.html"""
    n_iters = 10

    sys.stderr.write("Going to process vectors\n")
    sys.stderr.flush()

    N, D = vectors.shape  # Number of samples, dimension of the ambient space

    c = vectors[:num_clusters, :].clone()  # Simplistic initialization for the centroids

    x_i = LazyTensor(vectors.view(N, 1, D))  # (N, 1, D) samples
    c_j = LazyTensor(c.view(1, num_clusters, D))  # (1, K, D) centroids

    # K-means loop:
    # - x  is the (N, D) point cloud,
    # - cl is the (N,) vector of class labels
    # - c  is the (K, D) cloud of cluster centroids
    for _ in range(n_iters):
        # E step: assign points to the closest cluster -------------------------
        D_ij = ((x_i - c_j) ** 2).sum(-1)  # (N, K) symbolic squared distances
        cl = D_ij.argmin(dim=1).long().view(-1)  # Points -> Nearest cluster

        # M step: update the centroids to the normalized cluster average: ------
        # Compute the sum of points per cluster:
        c.zero_()
        c.scatter_add_(0, cl[:, None].repeat(1, D), vectors)

        # Divide by the number of points per cluster:
        Ncl = (
            torch.bincount(cl, minlength=num_clusters).type_as(c).view(num_clusters, 1)
        )
        c /= Ncl  # in-place division to compute the average
    return c


def outputVector(tensor: torch.Tensor):
    sys.stdout.buffer.write(tensor.cpu().float().flatten().numpy().tobytes())
    sys.stdout.buffer.flush()


def main():
    _, dimensions, clusters, *rest = sys.argv
    dimensions = int(dimensions)
    clusters = int(clusters)
    device = torch.device(rest[0]) if rest else "cpu"
    sys.stderr.write(f"Dimension {dimensions} : clusters {clusters} \n")
    buffer = b""
    while True:
        vector_bytes = sys.stdin.buffer.read(1)
        buffer += vector_bytes
        if len(buffer) < 4:
            continue
        batch_size = int.from_bytes(buffer[:4], "big")
        num_bytes = 4 * dimensions * batch_size

        if len(buffer) >= num_bytes + 4:
            vector = torch.frombuffer(
                bytearray(buffer[4 : num_bytes + 4]),
                dtype=torch.float32,
                count=dimensions * batch_size,
            ).to(device)

            output_tensor = cluster_vectors(
                clusters, vector.view(size=(batch_size, dimensions))
            )
            outputVector(output_tensor)
            buffer = buffer[num_bytes + 4 :]


if __name__ == "__main__":
    main()
