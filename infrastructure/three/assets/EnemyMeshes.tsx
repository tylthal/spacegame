import React, { useMemo } from 'react';
import { getEnemyGeometry, getEnemyMaterial, EnemyType } from './MergedEnemyGeometries';

/**
 * ENEMY MESH COMPONENT
 * 
 * Renders enemy meshes using the pre-baked merged geometries from MergedEnemyGeometries.ts.
 * Uses vertex colors for multi-part coloring (dark hull + glowing accents).
 * 
 * ========================================
 * MESH ORIENTATION CONVENTION
 * ========================================
 * - NOSE / FRONT: Position at +Z
 * - ENGINE / BACK: Position at -Z
 * 
 * The GameScene's EnemyRenderer uses lookAt(ahead) to orient enemies.
 */

/**
 * Select and render the appropriate mesh for an enemy type.
 * Uses merged geometries with vertex colors for performance and visuals.
 */
export const EnemyMesh = React.memo(function EnemyMesh({ kind }: { kind: string }) {
    // Get cached geometry and material
    const geometry = useMemo(() => getEnemyGeometry(kind as EnemyType), [kind]);
    const material = useMemo(() => getEnemyMaterial(kind as EnemyType), [kind]);

    return (
        <mesh geometry={geometry} material={material} />
    );
});
