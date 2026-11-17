import { useMemo } from 'react'
import OfficialComms from './OfficialComms.jsx'

// Digital Ledger official communication: owner and manager, manager and cashier.
// Put this file and OfficialComms.jsx in the Digital Ledger repository at src/features/comms/.
// Props:
//   supabase    the Supabase client your app already uses
//   businessId  optional: the business the person is working in (leave it out if each person belongs to one business)
export default function DlComms({ supabase, businessId }) {
  const api = useMemo(() => {
    const call = async (fn, args) => {
      const { data, error } = await supabase.rpc(fn, args)
      if (error) {
        throw new Error(/does not exist|schema cache/i.test(error.message)
          ? 'Run supabase/016_dl_official_comms.sql in Supabase (SQL Editor) first.'
          : error.message)
      }
      return data
    }
    const biz = { p_business: businessId || null }
    return {
      contacts: () => call('dl_comms_contacts', biz),
      list: box => call('dl_comms_list', { p_box: box, ...biz }),
      open: id => call('dl_comms_open', { p_thread: id, ...biz }),
      send: ({ to, kind, subject, body, thread }) => call('dl_comms_send', {
        p_to: to || null, p_kind: kind || null, p_subject: subject || null, p_body: body,
        p_thread: thread || null, ...biz
      }),
      ack: id => call('dl_comms_ack', { p_id: id, ...biz })
    }
  }, [supabase, businessId])

  return <OfficialComms api={api} />
}
