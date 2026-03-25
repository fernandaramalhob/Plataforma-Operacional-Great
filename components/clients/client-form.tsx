import type { ChangeEventHandler, ReactNode } from "react"
import { Mail, Phone } from "lucide-react"
import type { ClientFormValues } from "@/types/client.types"

type SharedClientFields = Pick<
  ClientFormValues,
  "email" | "phone" | "notes" | "whatsappGroupId"
>

type ClientFormProps = {
  title: string
  description: string
  leadFields?: ReactNode
  values: SharedClientFields
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
}

export function ClientForm({
  title,
  description,
  leadFields,
  values,
  onChange,
}: ClientFormProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-gray-900">{title}</h2>
      <p className="mb-8 text-sm text-gray-400">{description}</p>

      <div className="space-y-5">
        {leadFields}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            E-mail de contato
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="email"
              value={values.email}
              onChange={onChange}
              type="email"
              placeholder="contato@empresa.com.br"
              maxLength={160}
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Telefone
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="phone"
              value={values.phone}
              onChange={onChange}
              type="tel"
              placeholder="(11) 99999-9999"
              maxLength={25}
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Use entre 10 e 15 digitos, com ou sem mascara.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            ID do Grupo WhatsApp
          </label>
          <input
            name="whatsappGroupId"
            value={values.whatsappGroupId}
            onChange={onChange}
            type="text"
            placeholder="5511999999999-1234567890@g.us"
            maxLength={60}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
          />
          <p className="mt-2 text-xs text-gray-400">
            O numero da Evolution API deve estar no grupo antes de salvar.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Observacoes
          </label>
          <textarea
            name="notes"
            value={values.notes}
            onChange={onChange}
            placeholder="Notas internas sobre este cliente..."
            rows={4}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
          />
        </div>
      </div>
    </div>
  )
}
