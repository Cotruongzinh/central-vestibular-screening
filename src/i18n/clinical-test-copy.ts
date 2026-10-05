import type { AppLanguage } from '@/types/app-language';
import type { ClinicalTestId } from '@/types/test-administration';

const english = {
  'smooth-pursuit': {
    name: 'Smooth Pursuit', duration: '~30 sec', purpose: 'Assess the ability to smoothly follow a moving target.',
    clinicianInstruction: 'Keep the phone steady. Ask the patient to keep the head still and follow the target with the eyes only.',
    patientInstruction: 'Keep your head still. Follow the moving dot with your eyes only.',
    stimulusSummary: 'A dot moves smoothly from side to side without jumping.',
    measurements: ['Eye position', 'Eye velocity', 'Smooth pursuit gain', 'Corrective saccades', 'Signal quality'],
  },
  'horizontal-saccades': {
    name: 'Horizontal Saccades', duration: '~60 sec', purpose: 'Assess rapid horizontal eye movements.',
    clinicianInstruction: 'Ask the patient to look at the new target as soon as the dot changes position.',
    patientInstruction: 'Look at each new dot as quickly and accurately as you can.',
    stimulusSummary: 'The target jumps instantly between left, center, and right positions.',
    measurements: ['Latency', 'Peak velocity', 'Accuracy', 'Overshoot', 'Undershoot'],
  },
  'vertical-saccades': {
    name: 'Vertical Saccades', duration: '~60 sec', purpose: 'Assess rapid vertical eye movements.',
    clinicianInstruction: 'Ask the patient to keep the head still and move the eyes immediately when the target jumps up or down.',
    patientInstruction: 'Look at each new target as quickly as possible when the dot jumps up or down.',
    stimulusSummary: 'The target jumps instantly between upper, center, and lower positions.',
    measurements: ['Latency', 'Peak velocity', 'Accuracy', 'Overshoot', 'Undershoot'],
  },
  'anti-saccade': {
    name: 'Anti-Saccade', duration: '~45 sec', purpose: 'Assess the ability to suppress the reflex to look directly at a visual target.',
    clinicianInstruction: 'Explain the rule before the test: when a target appears on one side, the patient should look to the opposite side.',
    patientInstruction: 'When the dot appears on one side, look to the opposite side instead of looking at the dot.',
    stimulusSummary: 'A target appears randomly on the left or right; the intended response is to look in the opposite direction.',
    measurements: ['Correct response rate', 'Error rate', 'Latency', 'Correction latency'],
  },
  'gaze-evoked-nystagmus': {
    name: 'Gaze-Evoked Nystagmus', duration: '~30 sec', purpose: 'Observe eye movement while gaze is held at eccentric positions.',
    clinicianInstruction: 'Ask the patient to hold gaze on each target position until instructed to move to the next one.',
    patientInstruction: 'Keep looking at the displayed target until you are told to look at the next position.',
    stimulusSummary: 'The target is held in sequence at center, left, right, up, and down positions.',
    measurements: ['Eye position', 'Slow-phase velocity (SPV), when measurable', 'Beat frequency, when measurable', 'Direction'],
  },
  okn: {
    name: 'Optokinetic Nystagmus (OKN)', duration: '~30 sec', purpose: 'Assess the optokinetic response to moving stripes across the visual field.',
    clinicianInstruction: 'Ask the patient to watch the moving stripes naturally. The stimulus direction changes during the protocol.',
    patientInstruction: 'Watch the moving stripes naturally. Do not try to keep your eyes fixed on one point.',
    stimulusSummary: 'Parallel stripes move in one direction and then reverse direction.',
    measurements: ['OKN gain', 'Eye velocity', 'Asymmetry'],
  },
  npc: {
    name: 'Near Point of Convergence (NPC)', duration: '~45 sec', purpose: 'Measure the near point of convergence (NPC).',
    clinicianInstruction: 'Move the target gradually from far to near the patient’s nose and record BREAK and RECOVERY distances.',
    patientInstruction: 'Follow the target as it slowly moves toward your nose.',
    stimulusSummary: 'The target moves gradually from far to near along the viewing axis.',
    measurements: ['BREAK point', 'RECOVERY point', 'Estimated convergence distance'],
  },
} as const;

export function getLocalizedClinicalTest(
  test: {
    id: ClinicalTestId;
    nameVi: string;
    nameEn: string;
    durationLabel: string;
    purpose: string;
    clinicianInstruction: string;
    patientInstruction: string;
    stimulusSummary: string;
    measurements: readonly string[];
  },
  language: AppLanguage,
) {
  if (language === 'en') return english[test.id];
  return {
    name: test.nameVi,
    duration: test.durationLabel,
    purpose: test.purpose,
    clinicianInstruction: test.clinicianInstruction,
    patientInstruction: test.patientInstruction,
    stimulusSummary: test.stimulusSummary,
    measurements: test.measurements,
  };
}
