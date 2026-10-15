import React from 'react';
import type { LabScenario, ScenarioAttempt } from './types';

interface Props {
  scenario: LabScenario;
  attempt: ScenarioAttempt;
  onInspect: (id: string) => void;
}

function BottleDrawing({ color, x = 0, unlabelled = false }: { color: string; x?: number; unlabelled?: boolean }) {
  return <g transform={`translate(${x} 0)`}>
    <path d="M84 88h32v32l20 24v112H64V144l20-24z" fill="#fff" stroke="#6796a5" strokeWidth="2" />
    <path d="M66 184h68v70H66z" fill={color} opacity=".35" />
    <rect x="80" y="76" width="40" height="16" rx="4" fill="#829d9b" />
    {!unlabelled && <g>
      <rect x="77" y="160" width="47" height="54" rx="3" fill="#fff" stroke="#d8e5e8" />
      <path d="m100 172 13 13-13 13-13-13z" fill="#fff8e9" stroke="#d69043" strokeWidth="2" />
      <path d="M100 178v9m0 4v2" stroke="#b86821" strokeWidth="2" />
    </g>}
    {unlabelled && <path d="m69 268 31-7 3 4 8-2 4 20-39 7z" fill="#fff" stroke="#bdcdd2" />}
  </g>;
}

function GlassDrawing({ cracked = false }: { cracked?: boolean }) {
  return <g>
    <path d="M78 95v137a23 23 0 0 0 46 0V95" fill="#eefaff" stroke="#7aabb9" strokeWidth="3" />
    <path d="M80 182h42v50a21 21 0 0 1-42 0z" fill="#a3d9de" opacity=".6" />
    <ellipse cx="101" cy="95" rx="24" ry="5" fill="#fff" stroke="#7aabb9" strokeWidth="2" />
    {[120, 140, 160, 180].map(y => <path key={y} d={`M108 ${y}h13`} stroke="#7aabb9" />)}
    {cracked && <path d="m88 218 14 9-8 9 16 7-9 10" fill="none" stroke="#cf795c" strokeWidth="3" />}
    <path d="m144 258 18-6-5 18zM177 264l13-11 4 17z" fill="#d8eff6" stroke="#7aabb9" />
  </g>;
}

function MachineDrawing({ centrifuge = false }: { centrifuge?: boolean }) {
  return <g>
    <rect x="55" y="145" width="175" height="112" rx="18" fill="#f0f5f8" stroke="#8ba3b0" strokeWidth="2" />
    <ellipse cx="142" cy="148" rx="85" ry="37" fill="#fff" stroke="#8ba3b0" strokeWidth="2" />
    {centrifuge ? <g>
      <ellipse cx="142" cy="148" rx="54" ry="26" fill="#dce7ed" stroke="#94aab5" />
      <path d="M142 126v44m-44-22h88" stroke="#a6bac3" />
      <rect x="110" y="130" width="11" height="29" rx="5" fill="#d7a673" />
      <rect x="128" y="130" width="11" height="29" rx="5" fill="#82b9c6" />
    </g> : <g>
      <path d="M112 148v-41h60v41" fill="#e8f4f8" stroke="#7aabb9" strokeWidth="2" />
      <path d="M113 133h58v13h-58z" fill="#98d0c9" />
      <path d="M173 114h38v46" fill="none" stroke="#84a09b" strokeWidth="9" />
    </g>}
    <rect x="77" y="207" width="76" height="25" rx="5" fill="#d9ede7" stroke="#83a894" />
    <text x="89" y="224" fill="#32634e" fontSize="13" fontFamily="monospace">{centrifuge ? 'READY' : 'CHECK'}</text>
    <circle cx="196" cy="220" r="13" fill="#fff" stroke="#8ba3b0" strokeWidth="2" />
  </g>;
}

function WorkspaceDrawing({ exit = false }: { exit?: boolean }) {
  return <g>
    {exit && <g>
      <rect x="63" y="67" width="130" height="191" rx="3" fill="#e6f3eb" stroke="#86b097" strokeWidth="3" />
      <rect x="94" y="80" width="71" height="28" rx="4" fill="#fff" stroke="#94b9a2" />
      <path d="M108 94h40m-10-8 10 8-10 8" fill="none" stroke="#37805d" strokeWidth="3" />
    </g>}
    <rect x="102" y="185" width="108" height="74" rx="3" fill="#e9d8bd" stroke="#b29a76" strokeWidth="2" />
    <path d="M102 208h108m-54-23v74" stroke="#b29a76" strokeWidth="2" />
    <rect x="169" y="230" width="75" height="31" rx="4" fill="#eef4f5" stroke="#8ba8ac" />
    {!exit && <g>
      <path d="M47 185v-31h47v31m-53 0h59v73H41z" fill="#ecf5f7" stroke="#7aabb9" strokeWidth="2" />
      <path d="M68 243c-28 25 127 30 169-1" fill="none" stroke="#9b9cae" strokeWidth="5" />
    </g>}
  </g>;
}

function HygieneDrawing({ goggles = false }: { goggles?: boolean }) {
  return <g>
    {goggles ? <g>
      <path d="M49 156q18-37 70-6h22q54-31 72 6l-13 58h-54l-16-29-15 29H62z" fill="#e2f4f8" stroke="#75a9b7" strokeWidth="3" />
      <path d="M64 163h49v34H69zm85 0h49l-5 34h-44z" fill="#fff" stroke="#abd2dd" />
      <path d="M50 167 29 151m185 16 20-16" stroke="#97b5be" strokeWidth="6" />
    </g> : <g>
      <path d="M90 249 65 204q-12-15 2-19l24 20-5-80q0-14 10-14l8 65 1-79q2-15 12-12l1 86 9-74q4-15 14-8l-4 87 15-51q9-12 16-2l-13 95-16 31z" fill="#d7efec" stroke="#6ca99e" strokeWidth="2" />
      <rect x="171" y="175" width="56" height="84" rx="9" fill="#fff" stroke="#8ba3b0" strokeWidth="2" />
      <rect x="177" y="183" width="44" height="61" rx="4" fill="#eef4f8" />
    </g>}
  </g>;
}

export function ScenarioIllustration({ scenario, attempt, onInspect }: Props) {
  const type = scenario.model;
  const points = [[74, 115], [210, 166], [143, 253]];
  return <div className="scenario-illustration" aria-label={`Hiện trường: ${scenario.title}`}>
    <svg viewBox="0 0 290 310" role="img" aria-label={scenario.summary}>
      <defs>
        <pattern id={`grid-${scenario.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0v20" fill="none" stroke="#e5eef0" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="290" height="310" rx="16" fill="#f8fbfc" />
      <rect x="12" y="12" width="266" height="286" rx="12" fill={`url(#grid-${scenario.id})`} />
      <path d="M25 262h240" stroke="#a5bfc6" strokeWidth="2" />
      {['bottle', 'cabinet', 'waste', 'tray'].includes(type) && <>
        <BottleDrawing color={scenario.color} x={0} unlabelled={scenario.id === 'unknown-bottle'} />
        <BottleDrawing color="#82bcc7" x={83} />
        <rect x="53" y="257" width="178" height="12" rx="4" fill="#e3ecef" stroke="#9bb4be" />
      </>}
      {type === 'glass' && <GlassDrawing cracked />}
      {type === 'beaker' && <>
        <GlassDrawing />
        <path d="M160 160q-12-13 0-26m20 26q-12-13 0-26" fill="none" stroke="#d39b6a" strokeWidth="3" />
      </>}
      {['centrifuge', 'vacuum', 'switch'].includes(type) && <MachineDrawing centrifuge={type === 'centrifuge'} />}
      {type === 'crate' && <WorkspaceDrawing exit />}
      {type === 'goggles' && <HygieneDrawing goggles />}
      {type === 'gloves' && <HygieneDrawing />}
      {['hose', 'burner'].includes(type) && <>
        <rect x="85" y="245" width="90" height="15" rx="5" fill="#dce5eb" stroke="#8ba3b0" />
        <path d="M129 244V143" stroke="#a7b8c0" strokeWidth="17" />
        <path d="M145 231c95 36 92-70 44-70" fill="none" stroke="#b29478" strokeWidth="9" />
        <path d="m178 161 10 0" stroke="#d37d5e" strokeWidth="4" strokeDasharray="3 3" />
      </>}
      {type === 'pipette' && <>
        <path d="M82 245V122m0 0V91" stroke="#83afbb" strokeWidth="8" />
        <ellipse cx="82" cy="105" rx="13" ry="30" fill="#df9a8d" />
        <BottleDrawing x={63} color="#a9cbd7" />
      </>}
    </svg>
    {scenario.clues.map((clue, index) => {
      const observed = attempt.observed.includes(clue.id);
      return <button
        key={clue.id}
        type="button"
        className={`scenario-hotspot ${observed ? 'is-observed' : ''}`}
        style={{ left: `${points[index][0] / 290 * 100}%`, top: `${points[index][1] / 310 * 100}%` }}
        aria-label={`Quan sát: ${clue.title}`}
        aria-pressed={observed}
        disabled={attempt.stage !== 'observe'}
        onClick={() => onInspect(clue.id)}
      >{observed ? '✓' : index + 1}</button>;
    })}
  </div>;
}
