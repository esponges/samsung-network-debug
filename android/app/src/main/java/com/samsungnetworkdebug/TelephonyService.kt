package com.samsungnetworkdebug

import android.app.*
import android.content.Intent
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.telephony.*
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments

class TelephonyService : Service() {

    companion object {
        const val CHANNEL_ID = "telephony_monitor"
        const val NOTIFICATION_ID = 1001
    }

    private lateinit var telephonyManager: TelephonyManager
    private lateinit var audioManager: AudioManager

    private val telephonyCallback = PhoneTelephonyCallback()
    private var audioFocusRequest: AudioFocusRequest? = null

    override fun onCreate() {
        super.onCreate()
        telephonyManager = getSystemService(TELEPHONY_SERVICE) as TelephonyManager
        audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        registerListeners()
        return START_STICKY
    }

    override fun onDestroy() {
        unregisterListeners()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Listeners ────────────────────────────────────────────────────────────

    private fun registerListeners() {
        val executor = mainExecutor
        telephonyManager.registerTelephonyCallback(executor, telephonyCallback)
        registerAudioFocusListener()
    }

    private fun unregisterListeners() {
        telephonyManager.unregisterTelephonyCallback(telephonyCallback)
        audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    }

    private fun registerAudioFocusListener() {
        val listener = AudioManager.OnAudioFocusChangeListener { focusChange ->
            val focus = when (focusChange) {
                AudioManager.AUDIOFOCUS_GAIN -> "GAIN"
                AudioManager.AUDIOFOCUS_LOSS -> "LOSS"
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> "LOSS_TRANSIENT"
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> "LOSS_TRANSIENT_CAN_DUCK"
                else -> "UNKNOWN"
            }
            emitAudioFocus(focus)
        }

        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setOnAudioFocusChangeListener(listener)
            .setWillPauseWhenDucked(false)
            .build()

        audioFocusRequest = request
        audioManager.requestAudioFocus(request)
    }

    // ── TelephonyCallback ─────────────────────────────────────────────────────

    @RequiresApi(Build.VERSION_CODES.S)
    inner class PhoneTelephonyCallback : TelephonyCallback(),
        TelephonyCallback.SignalStrengthsListener,
        TelephonyCallback.CallStateListener,
        TelephonyCallback.DataConnectionStateListener {

        override fun onSignalStrengthsChanged(signalStrength: SignalStrength) {
            val timestamp = System.currentTimeMillis()
            var dBm = -999
            var asu = 0
            var level = 0
            var networkType = "UNKNOWN"

            for (cs in signalStrength.cellSignalStrengths) {
                if (cs.dbm != Int.MIN_VALUE && cs.dbm != Int.MAX_VALUE) {
                    dBm = cs.dbm
                    asu = cs.asuLevel
                    level = cs.level
                    networkType = when (cs) {
                        is CellSignalStrengthNr -> "NR"
                        is CellSignalStrengthLte -> "LTE"
                        is CellSignalStrengthWcdma -> "WCDMA"
                        is CellSignalStrengthGsm -> "GSM"
                        is CellSignalStrengthCdma -> "CDMA"
                        else -> "UNKNOWN"
                    }
                    break
                }
            }

            emitSignalStrength(dBm, asu, level, networkType, timestamp)
        }

        override fun onCallStateChanged(state: Int) {
            val stateStr = when (state) {
                TelephonyManager.CALL_STATE_IDLE -> "IDLE"
                TelephonyManager.CALL_STATE_RINGING -> "RINGING"
                TelephonyManager.CALL_STATE_OFFHOOK -> "OFFHOOK"
                else -> "UNKNOWN"
            }
            emitCallState(stateStr, System.currentTimeMillis())
        }

        override fun onDataConnectionStateChanged(state: Int, networkType: Int) {
            emitNetworkType(networkTypeToString(networkType), System.currentTimeMillis())
        }
    }

    // ── Emit helpers ──────────────────────────────────────────────────────────

    private fun emitSignalStrength(dBm: Int, asu: Int, level: Int, networkType: String, timestamp: Long) {
        val map = Arguments.createMap().apply {
            putInt("dBm", dBm)
            putInt("asu", asu)
            putInt("level", level)
            putString("networkType", networkType)
            putDouble("timestamp", timestamp.toDouble())
        }
        TelephonyModule.sendTelephonyEvent("signal_strength", map)
    }

    private fun emitCallState(state: String, timestamp: Long) {
        val map = Arguments.createMap().apply {
            putString("state", state)
            putDouble("timestamp", timestamp.toDouble())
        }
        TelephonyModule.sendTelephonyEvent("call_state", map)
    }

    private fun emitNetworkType(type: String, timestamp: Long) {
        val map = Arguments.createMap().apply {
            putString("type", type)
            putDouble("timestamp", timestamp.toDouble())
        }
        TelephonyModule.sendTelephonyEvent("network_type", map)
    }

    private fun emitAudioFocus(focus: String) {
        val map = Arguments.createMap().apply {
            putString("focus", focus)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        TelephonyModule.sendTelephonyEvent("audio_focus", map)
    }

    private fun networkTypeToString(type: Int): String = when (type) {
        TelephonyManager.NETWORK_TYPE_NR -> "NR"
        TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
        TelephonyManager.NETWORK_TYPE_HSPAP,
        TelephonyManager.NETWORK_TYPE_HSPA,
        TelephonyManager.NETWORK_TYPE_HSDPA,
        TelephonyManager.NETWORK_TYPE_HSUPA -> "HSPA"
        TelephonyManager.NETWORK_TYPE_UMTS -> "UMTS"
        TelephonyManager.NETWORK_TYPE_EDGE -> "EDGE"
        TelephonyManager.NETWORK_TYPE_GPRS -> "GPRS"
        TelephonyManager.NETWORK_TYPE_UNKNOWN -> "UNKNOWN"
        else -> "OTHER($type)"
    }

    // ── Notification ──────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Telephony Monitor",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Background telephony diagnostic service"
            setSound(null, null)
            enableVibration(false)
        }
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Network Debug")
            .setContentText("Monitoring telephony events…")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
