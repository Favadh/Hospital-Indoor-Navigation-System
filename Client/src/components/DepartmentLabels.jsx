import React from 'react';
import { Html } from '@react-three/drei';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Gets Department badge color and Material icon based on node name & type
 */
function getNodeBadgeMeta(name, type) {
  const n = (name || '').toLowerCase();

  if (n.includes('toilet') || n.includes('washroom') || n.includes('restroom')) {
    return { icon: 'wc', color: '#607d8b' };
  }
  if (n.includes('lift') || n.includes('elevator')) {
    return { icon: 'elevator', color: '#795548' };
  }
  if (n.includes('stair')) {
    return { icon: 'stairs', color: '#9e9e9e' };
  }
  if (n.includes('cafeteria') || n.includes('canteen') || n.includes('food')) {
    return { icon: 'restaurant', color: '#F57C00' };
  }
  if (n.includes('pharmacy') || n.includes('chemist') || n.includes('drug')) {
    return { icon: 'local_pharmacy', color: '#27ae60' };
  }
  if (n.includes('emergency') || n.includes('casuality')) {
    return { icon: 'emergency', color: '#EA4335' };
  }
  if (n.includes('icu') || n.includes('ot') || n.includes('operation')) {
    return { icon: 'medical_services', color: '#d63031' };
  }
  if (n.includes('lab') || n.includes('blood') || n.includes('test')) {
    return { icon: 'science', color: '#009688' };
  }
  if (n.includes('x-ray') || n.includes('radiology') || n.includes('scan') || n.includes('mri')) {
    return { icon: 'image', color: '#8e24aa' };
  }
  if (n.includes('ward') || n.includes('recovery') || n.includes('bed')) {
    return { icon: 'bed', color: '#2980b9' };
  }
  if (n.includes('reception') || n.includes('helpdesk')) {
    return { icon: 'meeting_room', color: '#4285F4' };
  }
  if (n.includes('registration') || n.includes('counter')) {
    return { icon: 'assignment', color: '#3f51b5' };
  }
  if (n.includes('waiting')) {
    return { icon: 'chair', color: '#FABC04' };
  }
  if (type === 'entrance' || n.includes('entrance') || n.includes('gate') || n.includes('exit')) {
    return { icon: 'login', color: '#4285F4' };
  }

  return { icon: 'room', color: '#4285F4' };
}

/**
 * 3D Department & Room Labels (Friend's Exact UI & UX Architecture):
 * - Circular 28px icon badge in category brand color with white border & drop shadow.
 * - Cornered white rounded box with bold standard dark text (#3C4043, 11px).
 * - Fixed screen-space size (no perspective distortion / distance factor) for constant crystal clarity.
 */
export default function DepartmentLabels({ nodes }) {
  // Only show labels for rooms and entrances, not corridor junctions
  const labelNodes = (nodes || []).filter((n) => n.type === 'room' || n.type === 'entrance');

  return (
    <group>
      {labelNodes.map((n, idx) => {
        const [wx, wz] = svgToWorld(n.x, n.y);
        const { icon, color } = getNodeBadgeMeta(n.name, n.type);

        return (
          <Html
            key={n._id || n.name || idx}
            position={[wx, 28, wz]}
            center
            zIndexRange={[0, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transform: 'translateY(-50%)',
                willChange: 'transform',
                contain: 'layout style paint',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {/* Circular Icon Badge */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  border: '2px solid #ffffff',
                }}
              >
                <span
                  className="material-symbols-outlined filled"
                  style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    lineHeight: 1,
                    fontVariationSettings: "'FILL' 1, 'wght' 600",
                  }}
                >
                  {icon}
                </span>
              </div>

              {/* Cornered Rounded Label Box with Default Dark Font Color (#3C4043, 11px) */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#3C4043',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.2px',
                    display: 'block',
                  }}
                >
                  {n.name}
                </span>
              </div>
            </div>
          </Html>
        );
      })}
    </group>
  );
}
