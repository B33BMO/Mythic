"use client";
import { useEffect, useRef } from 'react';

interface Vertex {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: Set<number>;
}

export default function VertexNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create vertices
    const vertices: Vertex[] = [];
    const vertexCount = 50;
    const connectionDistance = 150;

    for (let i = 0; i < vertexCount; i++) {
      vertices.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        connections: new Set()
      });
    }

    // Animation loop
    let animationFrameId: number;
    
    const render = () => {
      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update vertex positions and clear connections
      vertices.forEach(vertex => {
        vertex.x += vertex.vx;
        vertex.y += vertex.vy;
        vertex.connections.clear();

        // Bounce off edges
        if (vertex.x <= 0 || vertex.x >= canvas.width) vertex.vx *= -1;
        if (vertex.y <= 0 || vertex.y >= canvas.height) vertex.vy *= -1;
      });

      // Draw connections
      ctx.strokeStyle = '#00ffae';
      ctx.lineWidth = 1;

      for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
          const dx = vertices[i].x - vertices[j].x;
          const dy = vertices[i].y - vertices[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            // Calculate opacity based on distance (closer = more opaque)
            const opacity = 1 - (distance / connectionDistance);
            ctx.globalAlpha = opacity * 0.3;
            
            ctx.beginPath();
            ctx.moveTo(vertices[i].x, vertices[i].y);
            ctx.lineTo(vertices[j].x, vertices[j].y);
            ctx.stroke();

            // Store connection
            vertices[i].connections.add(j);
            vertices[j].connections.add(i);
          }
        }
      }

      // Draw vertices
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#00ffae';
      
      vertices.forEach(vertex => {
        // Pulse effect based on connection count
        const pulse = 1 + (vertex.connections.size * 0.1);
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 1 * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="vertex-network"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1
      }}
    />
  );
}
