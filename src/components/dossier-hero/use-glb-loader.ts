import { useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Object3D } from 'three';
import { GLB_URL, NODE_MAP, NODE_BEHAVIOUR, type SemanticNodeKey } from './hero-scene.config';

export type SemanticNodes = Partial<Record<SemanticNodeKey, Object3D>>;

interface GLBLoaderResult {
  scene: Object3D | null;
  nodes: SemanticNodes;
  loaded: boolean;
}

/**
 * Loads the hero GLB inside an R3F Canvas.
 * Extracts named nodes via the config lookup map and applies shadow flags.
 */
export function useGLBScene(): GLBLoaderResult {
  const { scene } = useGLTF(GLB_URL);
  const [result, setResult] = useState<GLBLoaderResult>({ scene: null, nodes: {}, loaded: false });

  useEffect(() => {
    if (!scene) return;

    const nodes: SemanticNodes = {};

    // Walk scene graph and map Blender names → semantic keys
    scene.traverse((child) => {
      const semantic = (NODE_MAP as Record<string, SemanticNodeKey>)[child.name];
      if (semantic) {
        nodes[semantic] = child;

        // Apply shadow flags from config
        const behaviour = NODE_BEHAVIOUR[semantic];
        if (behaviour) {
          if (behaviour.castShadow && 'castShadow' in child) child.castShadow = true;
          if (behaviour.receiveShadow && 'receiveShadow' in child) child.receiveShadow = true;
        }
      }
    });

    setResult({ scene, nodes, loaded: true });
  }, [scene]);

  return result;
}

// Preload for faster initial load
useGLTF.preload(GLB_URL);
