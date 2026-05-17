import {
  Callout,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  mergeStyle,
  useHostTheme,
} from "cursor/canvas";

/** Inline style objects compatible with `mergeStyle` / host canvas styling. */
type CanvasStyle = NonNullable<Parameters<typeof mergeStyle>[0]>;

type Paso = {
  n: number;
  titulo: string;
  detalle: string;
  servicio: string;
  manual?: boolean;
};

type Fase = {
  id: string;
  nombre: string;
  duracion: string;
  actor: string;
  pasos: Paso[];
};

const FASES: Fase[] = [
  {
    id: "compra",
    nombre: "Fase 0 — Compra y provisión",
    duracion: "~90 s",
    actor: "Cliente paga; backend provisiona",
    pasos: [
      {
        n: 1,
        titulo: "Cliente elige plan",
        detalle:
          "Landing con planes (Básico / Premium / Deluxe) y CTA para iniciar el pago.",
        servicio: "Frontend (Vercel)",
      },
      {
        n: 2,
        titulo: "Stripe Checkout",
        detalle:
          "Sesión alojada: cobro + email. Sin guardar PAN en nuestros servidores.",
        servicio: "Stripe Checkout",
      },
      {
        n: 3,
        titulo: "Webhook checkout.session.completed",
        detalle:
          "Evento firmado hacia /api/webhooks/stripe. Verificación de firma, deduplicación e idempotencia.",
        servicio: "Stripe → Vercel Function",
      },
      {
        n: 4,
        titulo: "Alta de la boda",
        detalle:
          "Inserción en base de datos: plan, email, slug único (p. ej. ana-y-carlos), estado pending_setup.",
        servicio: "Supabase Postgres",
      },
      {
        n: 5,
        titulo: "Email con enlace mágico",
        detalle:
          "Correo transaccional con JWT de corta vida al asistente de configuración /setup/[slug].",
        servicio: "Resend (SMTP API)",
      },
    ],
  },
  {
    id: "onboarding",
    nombre: "Fase 1 — Onboarding y assets",
    duracion: "~15 min (cliente)",
    actor: "Cliente rellena datos; IA genera imágenes",
    pasos: [
      {
        n: 6,
        titulo: "Asistente multipaso",
        detalle:
          "Nombres, fecha, ceremonia, banquete, copy, paleta. Autoguardado en cada paso.",
        servicio: "React + Supabase",
      },
      {
        n: 7,
        titulo: "Subida de fotos propias",
        detalle:
          "Arrastre de 5–10 fotos a almacenamiento; conversión automática a WebP optimizado.",
        servicio: "Supabase Storage",
        manual: true,
      },
      {
        n: 8,
        titulo: "Generación de assets con IA",
        detalle:
          "Imágenes de portada, ornamentos y separadores según paleta y estilo (API de imágenes).",
        servicio: "OpenAI Images API",
      },
      {
        n: 9,
        titulo: "Aprobación de assets IA",
        detalle:
          "Galería por variante: aceptar o regenerar con otra semilla antes de publicar.",
        servicio: "UI interna",
        manual: true,
      },
      {
        n: 10,
        titulo: "Versiones aprobadas",
        detalle:
          "Referencias guardadas en weddings.assets (JSON) y objetos marcados como approved en bucket.",
        servicio: "Supabase",
      },
    ],
  },
  {
    id: "publicacion",
    nombre: "Fase 2 — Publicación",
    duracion: "~30 s",
    actor: "Build y URL pública",
    pasos: [
      {
        n: 11,
        titulo: "Ensamblado del sitio",
        detalle:
          "Multi-tenant por slug; lectura desde Supabase; ISR con revalidación periódica.",
        servicio: "Vercel ISR",
      },
      {
        n: 12,
        titulo: "Subdominio activo + aviso",
        detalle:
          "ana-y-carlos.tusboda.com accesible; correo al cliente con URL y acceso al panel.",
        servicio: "Vercel + Resend",
      },
    ],
  },
  {
    id: "invitados",
    nombre: "Fase 3 — Invitados y envíos",
    duracion: "~5 min (cliente)",
    actor: "CSV e invitaciones masivas",
    pasos: [
      {
        n: 13,
        titulo: "Importación CSV / Excel",
        detalle:
          "Columnas detectadas: nombre, teléfono, email, acompañantes. Validación y errores por fila.",
        servicio: "Parser + Supabase",
      },
      {
        n: 14,
        titulo: "Tokens por invitado",
        detalle:
          "Un registro guests por fila con token opaco; URL /[slug]/i/[token] sin token no hay RSVP.",
        servicio: "Supabase",
      },
      {
        n: 15,
        titulo: "Cola de envío masivo",
        detalle:
          "WhatsApp Cloud API con plantillas aprobadas y rate limiting; fallback a email.",
        servicio: "WhatsApp + Resend",
      },
      {
        n: 16,
        titulo: "Estado de entrega",
        detalle:
          "Webhooks de estado (enviado / entregado / leído) y métricas en tiempo casi real.",
        servicio: "WhatsApp + Vercel KV",
      },
    ],
  },
  {
    id: "dia-d",
    nombre: "Fase 4 — RSVP y día D",
    duracion: "Semanas a meses",
    actor: "Automático salvo excepciones puntuales",
    pasos: [
      {
        n: 17,
        titulo: "RSVP en la web",
        detalle:
          "Confirmación sí/no, restricciones dietéticas, acompañantes; escritura directa con RLS.",
        servicio: "React + Supabase",
      },
      {
        n: 18,
        titulo: "Notificación a los novios",
        detalle:
          "Trigger o Edge Function: resumen por correo o canal interno ante cada cambio relevante.",
        servicio: "Supabase Edge",
      },
      {
        n: 19,
        titulo: "Recordatorios programados",
        detalle:
          "Cron diario: T-14, T-7, T-2 respecto al cierre de confirmación para pendientes.",
        servicio: "Vercel Cron",
      },
      {
        n: 20,
        titulo: "Propuesta de mesas (IA)",
        detalle:
          "Modelo de lenguaje con lista de confirmados y restricciones; salida JSON editable en UI.",
        servicio: "OpenAI Chat / GPT",
      },
      {
        n: 21,
        titulo: "Panel en vivo",
        detalle:
          "Contadores de confirmados, menús y entregas; KV para lecturas rápidas en dashboard.",
        servicio: "Vercel KV",
      },
      {
        n: 22,
        titulo: "Post-boda: álbum",
        detalle:
          "Job diferido invita a subir fotos del evento; galería compartida bajo el mismo slug.",
        servicio: "Cron + Storage",
      },
    ],
  },
];

const MANUALES_EXCEPCION = [
  {
    titulo: "Fotos personales del cliente",
    motivo:
      "No se pueden inventar. La subida es asistida (drag-and-drop) y el procesado es automático.",
    cuando: "Paso 7 — Onboarding",
  },
  {
    titulo: "Aprobación de imágenes generadas",
    motivo:
      "Control de calidad y cumplimiento: el cliente elige variantes antes de publicar.",
    cuando: "Paso 9 — Onboarding",
  },
  {
    titulo: "Alta inicial de plantillas WhatsApp (Meta)",
    motivo:
      "Meta exige revisión de plantillas; se configura una vez y se reutiliza en todas las bodas.",
    cuando: "Setup de negocio (único)",
  },
  {
    titulo: "Revisión opcional de mesas",
    motivo:
      "La IA propone; el cliente puede aceptar o ajustar en el editor visual.",
    cuando: "Paso 20 — Antes del evento",
  },
];

const SERVICIOS_ROWS: { nombre: string; uso: string; coste: string; estado: string }[] =
  [
    {
      nombre: "Stripe",
      uso: "Cobro, factura y webhooks de ciclo de vida del pago.",
      coste: "Comisión por transacción",
      estado: "A integrar",
    },
    {
      nombre: "Supabase",
      uso: "Postgres, Auth, Storage, triggers y Edge Functions.",
      coste: "Suscripción Pro típica",
      estado: "Parcial",
    },
    {
      nombre: "Vercel",
      uso: "Hosting, ISR, Functions, Cron y KV.",
      coste: "Plan Pro",
      estado: "Integrado",
    },
    {
      nombre: "OpenAI",
      uso: "Imágenes (assets) y propuesta de mesas (texto estructurado).",
      coste: "Por imagen / por llamada",
      estado: "A integrar",
    },
    {
      nombre: "WhatsApp Cloud API",
      uso: "Invitaciones y recordatorios con plantillas.",
      coste: "Por conversación / país",
      estado: "A integrar",
    },
    {
      nombre: "Resend",
      uso: "Enlaces mágicos y correos transaccionales.",
      coste: "Plan por volumen",
      estado: "A integrar",
    },
  ];

const WEBHOOKS: { evento: string; origen: string; accion: string; critico: boolean }[] =
  [
    {
      evento: "checkout.session.completed",
      origen: "Stripe",
      accion: "Crea boda y envía enlace de setup.",
      critico: true,
    },
    {
      evento: "invoice.payment_failed",
      origen: "Stripe",
      accion: "Aviso al cliente y posible bloqueo de funciones.",
      critico: true,
    },
    {
      evento: "customer.subscription.deleted",
      origen: "Stripe",
      accion: "Retención / archivo tras período de gracia.",
      critico: false,
    },
    {
      evento: "message status",
      origen: "WhatsApp",
      accion: "Actualiza columna de entrega por invitado.",
      critico: false,
    },
    {
      evento: "rsvp.submitted",
      origen: "App / DB trigger",
      accion: "Notifica a novios y refresca KV.",
      critico: true,
    },
    {
      evento: "cron_daily",
      origen: "Vercel Cron",
      accion: "Recordatorios y jobs de mantenimiento.",
      critico: true,
    },
  ];

function estadoPill(estado: string) {
  if (estado === "Integrado") {
    return <Pill tone="success" size="sm">{estado}</Pill>;
  }
  if (estado === "Parcial") {
    return <Pill tone="warning" size="sm">{estado}</Pill>;
  }
  return <Pill tone="info" size="sm">{estado}</Pill>;
}

function PasoFila({
  paso,
  styleBanner,
  styleManualFill,
  styleNumAuto,
  styleNumManual,
}: {
  paso: Paso;
  styleBanner: CanvasStyle;
  styleManualFill: CanvasStyle;
  styleNumAuto: CanvasStyle;
  styleNumManual: CanvasStyle;
}) {
  const manual = Boolean(paso.manual);
  return (
    <div
      style={mergeStyle(styleBanner, manual ? styleManualFill : {})}
    >
      <Row gap={12} align="start" style={{ width: "100%" }}>
        <div
          style={mergeStyle(
            {
              width: 28,
              height: 28,
              borderRadius: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            },
            manual ? styleNumManual : styleNumAuto,
          )}
        >
          {paso.n}
        </div>
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Row gap={8} align="center" wrap>
            <Text weight="semibold" style={{ flexShrink: 0 }}>
              {paso.titulo}
            </Text>
            {manual ? (
              <Pill tone="warning" size="sm">Manual cliente</Pill>
            ) : (
              <Pill tone="success" size="sm">Automático</Pill>
            )}
            <Pill tone="neutral" size="sm">{paso.servicio}</Pill>
          </Row>
          <Text tone="secondary" size="small">
            {paso.detalle}
          </Text>
        </Stack>
      </Row>
    </div>
  );
}

export default function FlujoPagoAutomatizado() {
  const theme = useHostTheme();

  const totalPasos = FASES.reduce((acc, f) => acc + f.pasos.length, 0);
  const pasosManuales = FASES.reduce(
    (acc, f) => acc + f.pasos.filter((p) => p.manual).length,
    0,
  );
  const pasosAuto = totalPasos - pasosManuales;
  const pct =
    totalPasos === 0 ? 0 : Math.round((pasosAuto / totalPasos) * 100);

  const stylePhaseIntro: CanvasStyle = {
    padding: "12px 14px",
    borderRadius: 8,
    marginBottom: 10,
    borderLeft: `4px solid ${theme.accent.primary}`,
    background: theme.fill.tertiary,
  };

  const stylePasoBanner: CanvasStyle = {
    padding: "12px 14px",
    borderRadius: 8,
    border: `1px solid ${theme.stroke.secondary}`,
    background: theme.bg.elevated,
  };

  const styleManualFill: CanvasStyle = {
    background: theme.fill.secondary,
    borderColor: theme.stroke.primary,
  };

  const styleNumAuto: CanvasStyle = {
    background: theme.accent.primary,
    color: theme.text.onAccent,
  };

  const styleNumManual: CanvasStyle = {
    background: theme.diff.stripRemoved,
    color: theme.text.primary,
  };

  const serviciosTableRows = SERVICIOS_ROWS.map((s) => [
    <Text weight="semibold" key={`n-${s.nombre}`}>{s.nombre}</Text>,
    s.uso,
    <Text size="small" tone="tertiary" key={`c-${s.nombre}`}>{s.coste}</Text>,
    estadoPill(s.estado),
  ]);

  const webhooksTableRows = WEBHOOKS.map((w) => [
    <Text size="small" key={`e-${w.evento}`} style={{ fontFamily: "ui-monospace, monospace" }}>
      {w.evento}
    </Text>,
    w.origen,
    w.accion,
    w.critico ? (
      <Pill tone="warning" size="sm" key={`crit-${w.evento}`}>Sí</Pill>
    ) : (
      <Pill tone="neutral" size="sm" key={`ok-${w.evento}`}>No</Pill>
    ),
  ]);

  return (
    <Stack gap={24} style={{ maxWidth: 920, margin: "0 auto", padding: "16px 12px" }}>
      <Stack gap={8}>
        <Text size="small" tone="tertiary" weight="semibold">
          Invitaciones de boda · Flujo end-to-end automatizado
        </Text>
        <H1>Del pago a la boda lista: operativa casi sin fricción</H1>
        <Text tone="secondary">
          Secuencia de 22 pasos desde el cobro (Stripe) hasta RSVP, recordatorios
          y cierre. Los pasos marcados como manuales son pocos y acotados.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value={String(totalPasos)} label="Pasos totales en el flujo" />
        <Stat
          value={String(pasosAuto)}
          label="Pasos automáticos"
          tone="success"
        />
        <Stat
          value={String(pasosManuales)}
          label="Pasos manuales (cliente)"
          tone="warning"
        />
        <Stat value={`${pct}%`} label="Grado de automatización (por pasos)" tone="info" />
      </Grid>

      <Divider />

      <Stack gap={16}>
        <H2>Flujo por fases</H2>
        {FASES.map((fase) => (
          <Stack key={fase.id} gap={10}>
            <div style={stylePhaseIntro}>
              <Row justify="space-between" align="start" wrap>
                <Text weight="bold">{fase.nombre}</Text>
                <Text size="small" tone="secondary">{fase.duracion}</Text>
              </Row>
              <Text size="small" tone="secondary">
                {fase.actor}
              </Text>
            </div>
            <Stack gap={8}>
              {fase.pasos.map((p) => (
                <PasoFila
                  key={p.n}
                  paso={p}
                  styleBanner={stylePasoBanner}
                  styleManualFill={styleManualFill}
                  styleNumAuto={styleNumAuto}
                  styleNumManual={styleNumManual}
                />
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>Excepciones manuales y por qué existen</H2>
        <Grid columns={2} gap={12}>
          {MANUALES_EXCEPCION.map((m) => (
            <Callout key={m.titulo} tone="warning" title={m.titulo}>
              <Stack gap={8}>
                <Text size="small">{m.motivo}</Text>
                <Pill tone="neutral" size="sm">{m.cuando}</Pill>
              </Stack>
            </Callout>
          ))}
        </Grid>
      </Stack>

      <Stack gap={12}>
        <H2>Servicios externos</H2>
        <Text size="small" tone="tertiary">
          Costes orientativos; revisar precios vigentes del proveedor.
        </Text>
        <Table
          headers={["Servicio", "Para qué", "Coste (referencia)", "Estado"]}
          rows={serviciosTableRows}
          striped
        />
      </Stack>

      <Stack gap={12}>
        <H2>Eventos y webhooks que mantienen el sistema coherente</H2>
        <Table
          headers={["Evento", "Origen", "Acción", "Crítico"]}
          rows={webhooksTableRows}
          columnAlign={["left", "left", "left", "left"]}
          striped
        />
      </Stack>

      <Stack gap={12}>
        <H2>Uso de OpenAI en dos puntos</H2>
        <Grid columns={2} gap={12}>
          <Callout tone="info" title="Imágenes (assets de marca)">
            <Text size="small">
              Paso 8: generación de portadas y ornamentos acorde a paleta y
              estilo. Facturación por imagen; almacenar prompts y hashes para
              trazabilidad.
            </Text>
          </Callout>
          <Callout tone="info" title="Mesas (salida estructurada)">
            <Text size="small">
              Paso 20: entrada con confirmados y restricciones; salida JSON
              validada y editable en la UI antes de publicar el plan de salón.
            </Text>
          </Callout>
        </Grid>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>Roadmap MVP en tres entregas</H2>
        <Stack gap={10}>
          <CardRoadmapItem
            index={1}
            titulo="Cobro + provisión"
            detalle="Stripe Checkout, webhook idempotente, fila weddings, email con enlace mágico."
          />
          <CardRoadmapItem
            index={2}
            titulo="Onboarding + IA visual"
            detalle="Asistente de datos, Storage, generación y aprobación de assets; ISR publicado."
          />
          <CardRoadmapItem
            index={3}
            titulo="Invitados + mensajería"
            detalle="Import CSV, cola WhatsApp, estados de entrega, cron de recordatorios."
          />
        </Stack>
      </Stack>

      <Callout tone="neutral" title="Resumen">
        <Text>
          Con proveedores conectados por webhooks y jobs programados, el cliente
          paga y el sistema crea la boda, genera la web y — tras la importación
          de invitados — despacha enlaces y mide entregas. Las únicas
          intervenciones humanas habituales son fotos propias, validación de
          creatividades IA y el registro único de plantillas Meta.
        </Text>
        <Text size="small" tone="tertiary">
          Fuente: plan interno · diseño 17 may 2026 (Europe/Madrid).
        </Text>
      </Callout>
    </Stack>
  );
}

function CardRoadmapItem({
  index,
  titulo,
  detalle,
}: {
  index: number;
  titulo: string;
  detalle: string;
}) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 8,
        border: `1px solid ${theme.stroke.secondary}`,
        background: theme.fill.quaternary,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9999,
          background: theme.accent.control,
          color: theme.text.onAccent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {index}
      </div>
      <Stack gap={6} style={{ flex: 1 }}>
        <H3>{titulo}</H3>
        <Text tone="secondary" size="small">
          {detalle}
        </Text>
      </Stack>
    </div>
  );
}
