# Pagos híbridos tienda — Preview / sandbox

Documentación para probar Mercado Pago + pago manual en **Vercel Preview** sin tocar Production.

## Variables (solo nombres — no commitear valores)

| Variable | Entorno | Uso |
|----------|---------|-----|
| `MERCADOPAGO_ENABLED` | Preview | `true` para mostrar botón MP |
| `STORE_MANUAL_PAYMENT_ENABLED` | Preview | `true` para pago en caja (default app: `true`) |
| `MERCADOPAGO_ACCESS_TOKEN` | Preview | Token **test** de MP (servidor) |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Preview | Public key test (si el código la usa) |
| `MERCADOPAGO_WEBHOOK_SECRET` | Preview | Secreto de firma webhook test |
| `MERCADOPAGO_ENVIRONMENT` | Preview | `test` |
| `NEXT_PUBLIC_SITE_URL` | Preview | URL HTTPS del deployment Preview |

**No modificar** estas variables en Production hasta completar pruebas sandbox E2E.

## Matriz de checkout

| `MERCADOPAGO_ENABLED` | `STORE_MANUAL_PAYMENT_ENABLED` | UI |
|-----------------------|--------------------------------|-----|
| `false` | `true` | Solo pago en caja |
| `true` | `true` | Selector híbrido |
| `true` | `false` | Solo Mercado Pago |
| `false` | `false` | Checkout deshabilitado |

## URL del webhook

Patrón actual en código:

```text
{NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago
```

Ejemplo Preview:

```text
https://<deployment>.vercel.app/api/webhooks/mercadopago
```

## Expiración automática de reservas

**Frecuencia objetivo:** cada 5 minutos.

### Supabase pg_cron (recomendado en staging)

Migración `20260711030000_store_reservation_expiration_job.sql`:

- Job `expire_store_reservations_every_5m` con `*/5 * * * *` si la extensión `pg_cron` está habilitada.
- `expire_store_reservations` revocado para `anon` y `authenticated`.

Verificar:

```sql
SELECT jobname, schedule FROM cron.job WHERE jobname = 'expire_store_reservations_every_5m';
```

### Vercel Cron (complementario)

- Endpoint: `GET /api/cron/expire-store-reservations`
- Variable: `CRON_SECRET`
- En **Hobby**, `vercel.json` usa un cron **diario** (límite de la plataforma). Para cada 5 min en Vercel, requiere **plan Pro** y schedule `*/5 * * * *` en el dashboard o `vercel.json`.

El endpoint también puede invocarse manualmente en staging:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/cron/expire-store-reservations
```

## Deployment Protection

Si el Preview exige login de Vercel, Mercado Pago **no podrá** entregar webhooks al endpoint.

Opciones seguras (sin desactivar protección global sin autorización):

1. Usar **Shareable Link** solo para pruebas de UI (no sirve para webhook).
2. Configurar `VERCEL_AUTOMATION_BYPASS_SECRET` en el proyecto y documentar bypass solo para automatización interna.
3. Usar un **subdominio staging** sin protección, dedicado a integraciones.
4. Probar webhooks con **ngrok** apuntando a local (desarrollo).

**No** apuntar webhooks de prueba a `australeproducciones.com` sin advertir: impacta la base de producción.

## Flujos a validar en sandbox

1. Pago manual: reserva → confirmación cajero → puntos → preparación → entrega.
2. Mercado Pago: reserva → preferencia → redirect → webhook → confirmación automática.
3. Doble cobro: manual primero → webhook MP → `payment_review`.
4. Pago tardío MP tras expiración → `payment_review` sin venta automática.
5. Idempotencia: doble clic confirmación manual, webhook duplicado.

## Limitación actual

No declarar MP operativo hasta completar compra sandbox con cuenta compradora test y webhook auténtico verificado.
