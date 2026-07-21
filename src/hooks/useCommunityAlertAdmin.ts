import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ContactCategory, EmergencyContact, WatchGroup } from "@/types/communityAlert";

// The migration may be newer than the generated Supabase type file.
const db = supabase as any;

export function useCommunityAlertAdmin() {
  const [groups, setGroups] = useState<WatchGroup[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [groupResult, contactResult, alertResult] = await Promise.all([
      db.from("community_watch_groups").select("id,name,community,ward,leader_name,escalation_minutes,community_group_members(id,phone,whatsapp_target)"),
      db.from("emergency_contacts").select("id,name,category,phone,whatsapp_target,community,active,incident_types,authority_level").order("name"),
      db.from("community_alerts").select("id,incident_type,summary,location,threat_level,status,escalation_level,created_at").order("created_at",{ascending:false}).limit(50),
    ]);
    if (groupResult.error) throw groupResult.error;
    if (contactResult.error) throw contactResult.error;
    if (alertResult.error) throw alertResult.error;
    setGroups((groupResult.data ?? []).map((g:any) => ({
      id:g.id, name:g.name, community:g.community, ward:g.ward ?? "", leader:g.leader_name ?? "Unassigned",
      memberCount:g.community_group_members?.length ?? 0,
      phoneNumbers:(g.community_group_members ?? []).map((m:any)=>m.phone),
      whatsappTargets:(g.community_group_members ?? []).map((m:any)=>m.whatsapp_target).filter(Boolean),
    })));
    setContacts((contactResult.data ?? []).map((c:any)=>({id:c.id,name:c.name,category:c.category,phone:c.phone,whatsapp:c.whatsapp_target,community:c.community,active:c.active})));
    setAlerts(alertResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh().catch(()=>setLoading(false)); }, [refresh]);

  async function createGroup(input:{name:string;community:string;ward:string;leader:string;escalationMinutes:number}) {
    const {data:{user}}=await supabase.auth.getUser(); if(!user) throw new Error("Sign in required");
    const {error}=await db.from("community_watch_groups").insert({owner_id:user.id,name:input.name,community:input.community,ward:input.ward,leader_name:input.leader,escalation_minutes:input.escalationMinutes});
    if(error) throw error; await refresh();
  }
  async function addMember(groupId:string,input:{name:string;phone:string;whatsapp:string;language:string}) {
    const {error}=await db.from("community_group_members").insert({group_id:groupId,name:input.name,phone:input.phone,whatsapp_target:input.whatsapp||null,preferred_language:input.language,whatsapp_enabled:Boolean(input.whatsapp)});
    if(error) throw error; await refresh();
  }
  async function deleteGroup(id:string) { const {error}=await db.from("community_watch_groups").delete().eq("id",id); if(error)throw error; await refresh(); }
  async function createContact(input:{name:string;category:ContactCategory;phone:string;whatsapp:string;community:string;incidentTypes:string;authorityLevel:number}) {
    const {data:{user}}=await supabase.auth.getUser(); if(!user) throw new Error("Sign in required");
    const {error}=await db.from("emergency_contacts").insert({owner_id:user.id,name:input.name,category:input.category,phone:input.phone,whatsapp_target:input.whatsapp||null,community:input.community||null,incident_types:input.incidentTypes.split(",").map(v=>v.trim().toLowerCase()).filter(Boolean),authority_level:input.authorityLevel});
    if(error)throw error; await refresh();
  }
  async function toggleContact(id:string,active:boolean){const {error}=await db.from("emergency_contacts").update({active}).eq("id",id);if(error)throw error;await refresh()}
  async function deleteContact(id:string){const {error}=await db.from("emergency_contacts").delete().eq("id",id);if(error)throw error;await refresh()}
  async function resolveAlert(id:string){const {error}=await db.from("community_alerts").update({status:"resolved",resolved_at:new Date().toISOString(),next_escalation_at:null}).eq("id",id);if(error)throw error;await refresh()}
  return {groups,contacts,alerts,loading,createGroup,addMember,deleteGroup,createContact,toggleContact,deleteContact,resolveAlert,refresh};
}
