// src/components/StateMachineFloatingPanel.tsx
import React from 'react';

interface Props {
  data: Record<string, any>;
}

export const StateMachineFloatingPanel: React.FC<Props> = ({ data }) => {
  const components = Object.keys(data);
  if (components.length === 0) return null;

  return (
    <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 50, pointerEvents: 'none' }}>
      {components.map(compName => {
        const machines = data[compName];
        const smName = Object.keys(machines)[0];
        const states = machines[smName];
        if (!states) return null;
        
        const width = 260;
        const height = 180;
        const cx = width / 2;
        const cy = height / 2;
        const r = 55;
        const nodeRadius = 22;

        const positions = new Map<string, { x: number, y: number }>();
        states.forEach((s: any, i: number) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / states.length;
          positions.set(s.name, {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle)
          });
        });

        return (
          <div key={compName} style={{ backgroundColor: 'rgba(37, 37, 38, 0.85)', backdropFilter: 'blur(4px)', borderRadius: '6px', border: '1px solid #3c3c3c', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '6px 12px', backgroundColor: 'rgba(45, 45, 45, 0.9)', borderBottom: '1px solid #3c3c3c', fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>
              {compName} <span style={{ color: '#4facfe', fontWeight: 'normal' }}>({smName})</span>
            </div>
            <div style={{ position: 'relative' }}>
              <svg width={width} height={height}>
                <defs>
                  <marker id="arrowHead" markerWidth="8" markerHeight="8" refX={nodeRadius + 6} refY="4" orient="auto">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#666" />
                  </marker>
                  <marker id="arrowHeadActive" markerWidth="8" markerHeight="8" refX={nodeRadius + 6} refY="4" orient="auto">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#4facfe" />
                  </marker>
                </defs>

                {states.map((s: any) => {
                  const start = positions.get(s.name)!;
                  return s.allowed_transitions.map((targetName: string) => {
                    const end = positions.get(targetName);
                    if (!end) return null;
                    
                    const isActiveTransition = s.is_current;

                    if (start.x === end.x && start.y === end.y) {
                      const offset = nodeRadius * 0.7;
                      return (
                        <path
                          key={`${s.name}->self`}
                          d={`M ${start.x + offset} ${start.y - offset} C ${start.x + nodeRadius * 2} ${start.y - nodeRadius * 2}, ${start.x + nodeRadius * 2} ${start.y + nodeRadius}, ${start.x + nodeRadius} ${start.y + offset}`}
                          fill="none"
                          stroke={isActiveTransition ? '#4facfe' : '#666'}
                          strokeWidth={isActiveTransition ? 2 : 1.5}
                          markerEnd={`url(#${isActiveTransition ? 'arrowHeadActive' : 'arrowHead'})`}
                        />
                      );
                    }
                    
                    const dx = end.x - start.x;
                    const dy = end.y - start.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const nx = -dy / dist;
                    const ny = dx / dist;
                    const offset = 6; 

                    const x1 = start.x + nx * offset;
                    const y1 = start.y + ny * offset;
                    const x2 = end.x + nx * offset;
                    const y2 = end.y + ny * offset;

                    return (
                      <line 
                        key={`${s.name}->${targetName}`} 
                        x1={x1} y1={y1} x2={x2} y2={y2} 
                        stroke={isActiveTransition ? '#4facfe' : '#666'} 
                        strokeWidth={isActiveTransition ? 2 : 1.5} 
                        markerEnd={`url(#${isActiveTransition ? 'arrowHeadActive' : 'arrowHead'})`} 
                      />
                    );
                  });
                })}
                
                {states.map((s: any) => {
                  const pos = positions.get(s.name)!;
                  return (
                    <g key={s.name}>
                      <circle 
                        cx={pos.x} cy={pos.y} r={nodeRadius} 
                        fill={s.is_current ? '#094771' : '#2d2d2d'} 
                        stroke={s.is_current ? '#4facfe' : '#555'} 
                        strokeWidth={s.is_current ? 2 : 1}
                      />
                      <text 
                        x={pos.x} y={pos.y} 
                        textAnchor="middle" dominantBaseline="central" 
                        fill={s.is_current ? '#ffffff' : '#cccccc'} 
                        fontSize="9"
                        fontWeight={s.is_current ? 'bold' : 'normal'}
                      >
                        {s.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};