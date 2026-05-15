# Jira Integration Skill

Una colección de scripts en JavaScript (Node.js) puros y **sin dependencias externas** para interactuar con Jira desde la terminal. Diseñada para ser utilizada como una Skill de Gemini CLI, pero totalmente funcional como CLI independiente.

## Características
- **Cero Dependencias:** No requiere `npm install`. Usa el `fetch` nativo de Node.js.
- **Detección Inteligente:** Valida automáticamente si estás en Jira Cloud y te guía con la configuración necesaria.
- **Modular y Extensible:** Los comandos están organizados por dominio (issue, search, comment, etc.).
- **Contexto Incremental:** Optimizada para que IAs puedan añadir nuevas capacidades de forma dinámica.

## Requisitos
- Node.js v24 o superior (para soporte nativo de `fetch`).

## Instalación y Configuración

1. **Clonar o Copiar:** Asegúrate de tener la carpeta `scripts/` y `references/` en tu entorno.
2. **Configurar Entorno:** Copia el archivo `.env.example` a `.env` y completa las variables:

### Variables de Entorno

| Variable | Requisito | Descripción |
| :--- | :--- | :--- |
| `JIRA_BASE_URL` | **Obligatorio** | URL de tu instancia (ej: `https://tu-empresa.atlassian.net`). |
| `JIRA_TOKEN` | **Obligatorio** | API Token (Cloud) o Personal Access Token (Datacenter). |
| `JIRA_USER_EMAIL` | **Obligatorio (Cloud)** | Tu email de Atlassian. Solo para Jira Cloud. |

> **Nota para Jira Cloud:** Debes generar un API Token en [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens).

## Uso Rápido

Ejecuta el punto de entrada con `node`:

```bash
# Ver ayuda
node scripts/jira-api.js help

# Buscar incidencias
node scripts/jira-api.js search "project = PROJ AND status = Open"

# Ver detalle de un ticket
node scripts/jira-api.js issue get PROJ-123

# Añadir un comentario
node scripts/jira-api.js comment add PROJ-123 --body "Trabajando en esto."
```

## Arquitectura
- `scripts/jira-api.js`: Punto de entrada (CLI).
- `scripts/lib/jira-client.js`: Cliente HTTP central con manejo automático de autenticación (Bearer/Basic). Incluye encabezado `User-Agent: Mozilla/5.0` para eludir restricciones de firewalls (WAF).
- `scripts/lib/commands/`: Módulos de comandos por dominio.
- `references/`: Documentación técnica y flujos para que la IA escale la herramienta.

## Contribución y Extensión (Para IAs)
Esta skill utiliza un **Flujo de Auto-Incremento**. Si una capacidad no existe, la IA debe consultar `references/auto-increment-workflow.md` para implementar el parche necesario de forma segura.
