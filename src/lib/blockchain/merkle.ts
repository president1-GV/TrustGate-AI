/**
 * TRUSTGATE AI — Deterministic Cryptographic Merkle Tree Engine
 * 
 * Computes verifiable Merkle roots and cryptographic inclusion proofs
 * for AI model provenance and batch checkpoint anchoring.
 */

import { computeSha256 } from "@/lib/provenance";

export interface MerkleProofStep {
  position: "left" | "right";
  data: string;
}

export class MerkleTree {
  private leaves: string[];
  private layers: string[][];

  private constructor(leaves: string[], layers: string[][]) {
    this.leaves = leaves;
    this.layers = layers;
  }

  public static async create(hashes: string[]): Promise<MerkleTree> {
    if (!hashes.length) {
      const emptyRoot = await computeSha256(new TextEncoder().encode("EMPTY_MERKLE_ROOT"));
      return new MerkleTree([], [[emptyRoot]]);
    }

    const leaves = [...hashes];
    const layers: string[][] = [leaves];

    let currentLayer = leaves;
    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
        const combined = left < right ? `${left}${right}` : `${right}${left}`;
        const parent = await computeSha256(new TextEncoder().encode(combined));
        nextLayer.push(parent);
      }
      layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    return new MerkleTree(leaves, layers);
  }

  public getRoot(): string {
    const topLayer = this.layers[this.layers.length - 1];
    return topLayer ? topLayer[0] : "";
  }

  public getProof(index: number): MerkleProofStep[] {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Index ${index} out of bounds for leaf count ${this.leaves.length}`);
    }

    const proof: MerkleProofStep[] = [];
    let currentIndex = index;

    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const currentLayer = this.layers[layerIndex];
      const isRightNode = currentIndex % 2 === 1;
      const pairIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (pairIndex < currentLayer.length) {
        proof.push({
          position: isRightNode ? "left" : "right",
          data: currentLayer[pairIndex],
        });
      } else {
        // Odd node paired with itself
        proof.push({
          position: "right",
          data: currentLayer[currentIndex],
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  public static async verifyProof(
    leaf: string,
    proof: MerkleProofStep[],
    expectedRoot: string
  ): Promise<boolean> {
    let currentHash = leaf;

    for (const step of proof) {
      const combined =
        step.position === "left"
          ? step.data < currentHash
            ? `${step.data}${currentHash}`
            : `${currentHash}${step.data}`
          : currentHash < step.data
          ? `${currentHash}${step.data}`
          : `${step.data}${currentHash}`;
      currentHash = await computeSha256(new TextEncoder().encode(combined));
    }

    return currentHash === expectedRoot;
  }
}
