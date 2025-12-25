import { useEffect } from 'react';
import { PhaseManager, Phase, PhaseEvent } from '../phase/PhaseManager';
import { CombatLoop } from '../gameplay/CombatLoop';

/**
 * usePhaseSync - Sync PhaseManager state to React state and handle transitions
 */
export function usePhaseSync(
    phaseManager: PhaseManager,
    combatLoop: CombatLoop,
    setPhase: (phase: Phase) => void
) {
    useEffect(() => {
        // Initial sync
        setPhase(phaseManager.phase);

        // Subscribe to changes
        return phaseManager.subscribe((event: PhaseEvent) => {
            if (event.type === 'transition') {
                setPhase(event.to);
                console.log('[Phase] Transition:', event.from, '->', event.to, 'Reason:', event.reason);

                // Reset Combat Loop on Game Start OR when returning to Title
                if ((event.to === 'PLAYING' && event.from !== 'PLAYING') || event.to === 'TITLE') {
                    combatLoop.reset();
                }
            }
        });
    }, [phaseManager, combatLoop, setPhase]);
}
