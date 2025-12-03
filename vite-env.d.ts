/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_WHATSAPP_PROVIDER: string
    readonly VITE_WHATSAPP_EVOLUTION_BASE_URL: string
    readonly VITE_WHATSAPP_EVOLUTION_INSTANCE_NAME: string
    readonly VITE_WHATSAPP_EVOLUTION_API_KEY: string
    readonly VITE_WHATSAPP_BUSINESS_PHONE_ID: string
    readonly VITE_WHATSAPP_BUSINESS_TOKEN: string
    readonly VITE_WHATSAPP_ZAPI_URL: string
    readonly VITE_WHATSAPP_ZAPI_INSTANCE: string
    readonly VITE_WHATSAPP_ZAPI_TOKEN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
