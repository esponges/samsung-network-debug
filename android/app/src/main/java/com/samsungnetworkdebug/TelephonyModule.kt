package com.samsungnetworkdebug

import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TelephonyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TelephonyModule"

        @Volatile
        private var instance: TelephonyModule? = null

        fun sendTelephonyEvent(name: String, params: WritableMap) {
            instance?.emitEvent(name, params)
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun startMonitoring() {
        val intent = Intent(reactApplicationContext, TelephonyService::class.java)
        reactApplicationContext.startForegroundService(intent)
    }

    @ReactMethod
    fun stopMonitoring() {
        val intent = Intent(reactApplicationContext, TelephonyService::class.java)
        reactApplicationContext.stopService(intent)
    }

    // Required by RN event emitter infrastructure — no-ops here since listeners are managed in JS
    @ReactMethod
    fun addListener(eventType: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun emitEvent(name: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    override fun invalidate() {
        if (instance === this) instance = null
        super.invalidate()
    }
}
