import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {}
  }

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Les notifications push ne sont pas supportées sur ce navigateur.')
      return
    }
    if (!VAPID_PUBLIC_KEY) {
      alert('Clé VAPID manquante. Configurez VITE_VAPID_PUBLIC_KEY dans .env')
      return
    }
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })

      setSubscribed(true)

      // Notification de bienvenue
      await fetch('/api/send-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: user.id,
    title: '⚡ TradeForge activé',
    body: 'Tu recevras des rappels pour journaliser tes trades.',
    url: '/dashboard'
  })
})
    } catch (err) {
      console.error('Subscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { permission, subscribed, loading, subscribe, unsubscribe }
}