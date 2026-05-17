import { Divider, Grid, H1, H2, Stack, Stat, Table, Text } from 'cursor/canvas';

const manualItems = [
  ["Crear invitación", "Admin escribe nombre + apellido a mano, uno por uno", "Alta"],
  ["Enviar enlace", "Admin copia el enlace generado y lo pega en WhatsApp manualmente", "Alta"],
  ["Confirmar asistencia", "Invitado pulsa botón → abre WhatsApp → admin lo valida a mano", "Alta"],
  ["Actualizar estado", "Admin cambia el estado (pendiente → enviado → confirmado) a mano", "Media"],
  ["Fotos de la boda", "Las imágenes están hardcodeadas en el código fuente", "Media"],
  ["Menú / mesa", "Asignación de mesa y menú se hace manualmente desde el dashboard", "Media"],
  ["Exportar lista", "CSV/Excel manual, ninguna automatización post-confirmación", "Baja"],
];

const autoItems = [
  ["Pago con Stripe", "Cliente paga → se genera la web de boda automáticamente"],
  ["Importar lista de invitados", "Subir Excel/CSV → el sistema crea todos los enlaces de golpe"],
  ["Envío masivo WhatsApp", "Un clic → el sistema manda los enlaces a todos los invitados"],
  ["RSVP sin WhatsApp", "Formulario directo en la web → estado se actualiza solo, sin intermediarios"],
  ["Email de confirmación", "Al confirmar asistencia → email automático al invitado y a los novios"],
  ["Recordatorio automático", "7 días antes del límite → SMS/email a quien no ha confirmado"],
  ["Asignación de mesas IA", "Con los confirmados → proponer asignación automática de mesas"],
];

const techStack = [
  ["Stripe", "Cobro y activación del servicio", "Ya disponible para integrar"],
  ["Supabase", "Base de datos ya en el proyecto", "Parcialmente presente"],
  ["Vercel KV", "Analytics en tiempo real", "YA INTEGRADO"],
  ["React + Vite", "Frontend de la invitación", "YA INTEGRADO"],
  ["WhatsApp API", "Envío masivo de enlaces", "Pendiente"],
  ["Resend / Brevo", "Emails automáticos de confirmación", "Pendiente"],
  ["WordPress", "NO recomendado — añade complejidad innecesaria", "DESCARTAR"],
];

function StatusBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Alta: '#7f1d1d',
    Media: '#92400e',
    Baja: '#065f46',
    'YA INTEGRADO': '#065f46',
    'Parcialmente presente': '#92400e',
    'Pendiente': '#1e3a5f',
    'Ya disponible para integrar': '#4a3800',
    'DESCARTAR': '#6b0000',
  };
  const bgColors: Record<string, string> = {
    Alta: '#fee2e2',
    Media: '#fef3c7',
    Baja: '#d1fae5',
    'YA INTEGRADO': '#d1fae5',
    'Parcialmente presente': '#fef3c7',
    'Pendiente': '#dbeafe',
    'Ya disponible para integrar': '#fef9c3',
    'DESCARTAR': '#fecaca',
  };
  const color = colors[level] ?? '#374151';
  const bg = bgColors[level] ?? '#f3f4f6';
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color,
      background: bg,
      borderRadius: 4,
      padding: '2px 8px',
    }}>
      {level}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#6b7280',
      }}>{children}</span>
    </div>
  );
}

function FlowStep({ number, title, desc, highlight }: { number: number; title: string; desc: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      padding: '14px 16px',
      background: highlight ? '#f0fdf4' : '#fafafa',
      border: `1.5px solid ${highlight ? '#86efac' : '#e5e7eb'}`,
      borderRadius: 8,
      flex: 1,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: highlight ? '#16a34a' : '#374151',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 14,
        flexShrink: 0,
      }}>{number}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: highlight ? '#15803d' : '#111827', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function DiagnosticoAutomatizacion() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9ca3af' }}>
          Invitaciones de boda · Diagnóstico técnico
        </span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>
        Lo que hay, lo que falta, lo que se puede automatizar
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 32px 0' }}>
        La web ya funciona bien. El problema es que casi todo se hace a mano. Esto es lo que se puede cambiar.
      </p>

      {/* Resumen rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Cosas ya funcionando', value: '8', tone: 'ok' },
          { label: 'Procesos manuales', value: '7', tone: 'warn' },
          { label: 'Automatizaciones posibles', value: '7', tone: 'info' },
          { label: 'Tecnología a añadir', value: '3', tone: 'neutral' },
        ].map(({ label, value, tone }) => {
          const colors: Record<string, { bg: string; fg: string; border: string }> = {
            ok: { bg: '#f0fdf4', fg: '#15803d', border: '#86efac' },
            warn: { bg: '#fff7ed', fg: '#c2410c', border: '#fdba74' },
            info: { bg: '#eff6ff', fg: '#1d4ed8', border: '#93c5fd' },
            neutral: { bg: '#f9fafb', fg: '#374151', border: '#d1d5db' },
          };
          const c = colors[tone];
          return (
            <div key={label} style={{
              background: c.bg,
              border: `1.5px solid ${c.border}`,
              borderRadius: 8,
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: c.fg, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Procesos manuales */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Lo que se hace a mano hoy (y no debería)</SectionTitle>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Proceso</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Cómo se hace ahora</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Urgencia</th>
              </tr>
            </thead>
            <tbody>
              {manualItems.map(([proc, desc, urgency], i) => (
                <tr key={proc} style={{ borderBottom: i < manualItems.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{proc}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', lineHeight: 1.4 }}>{desc}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge level={urgency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flujo ideal con Stripe */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>El flujo ideal: pagan con Stripe → todo sale solo</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <FlowStep number={1} title="Cliente paga" desc="Stripe recibe el pago y dispara un webhook automático" highlight />
          <FlowStep number={2} title="Se crea la boda" desc="El sistema genera la URL, sube las fotos y configura la web" highlight />
          <FlowStep number={3} title="Admin sube la lista" desc="CSV con nombres → el sistema crea todos los enlaces de invitación" highlight />
          <FlowStep number={4} title="Envío masivo" desc="WhatsApp API o email envía cada enlace personalizado automáticamente" highlight />
          <FlowStep number={5} title="Invitados confirman" desc="RSVP en la web → base de datos se actualiza, sin WhatsApp manual" highlight />
          <FlowStep number={6} title="Recordatorios" desc="7 días antes del límite → aviso automático a los que no han confirmado" highlight />
        </div>
      </div>

      {/* Automatizaciones posibles */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Qué se puede automatizar (y cómo)</SectionTitle>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Automatización</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Qué hace</th>
              </tr>
            </thead>
            <tbody>
              {autoItems.map(([auto, desc], i) => (
                <tr key={auto} style={{ borderBottom: i < autoItems.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#15803d' }}>{auto}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', lineHeight: 1.4 }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tecnología */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Tecnología: qué hay, qué falta, qué descartar</SectionTitle>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Herramienta</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Para qué</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#374151' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {techStack.map(([tool, use, status], i) => (
                <tr key={tool} style={{ borderBottom: i < techStack.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: status === 'DESCARTAR' ? '#991b1b' : '#111827', textDecoration: status === 'DESCARTAR' ? 'line-through' : 'none' }}>{tool}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', lineHeight: 1.4 }}>{use}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge level={status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Veredicto */}
      <div style={{
        background: '#1e293b',
        borderRadius: 10,
        padding: '20px 24px',
        color: 'white',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
          Veredicto — sin tecnicismos
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.7, color: '#e2e8f0' }}>
          La web de la boda ya está hecha y funciona bien. Lo que falta es el motor de negocio: que cuando alguien pague, todo se genere solo. Eso se hace en 3 pasos: <strong style={{ color: '#a7f3d0' }}>Stripe para el cobro</strong>, una pequeña <strong style={{ color: '#a7f3d0' }}>API que active la web automáticamente</strong>, y <strong style={{ color: '#a7f3d0' }}>un formulario RSVP directo</strong> (sin WhatsApp). WordPress no aporta nada aquí — añade peso sin resolver el problema real.
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
        Diagnóstico generado el 17 de mayo de 2026
      </div>
    </div>
  );
}
