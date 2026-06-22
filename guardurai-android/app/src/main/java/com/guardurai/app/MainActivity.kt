package com.guardurai.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // If launched from another app's "Share" sheet, prefill the shared text.
        val shared = if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
        } else {
            ""
        }

        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF1D4ED8))) {
                Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFFF8FAFC)) {
                    CheckScreen(initialText = shared)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckScreen(initialText: String) {
    var text by remember { mutableStateOf(initialText) }
    var loading by remember { mutableStateOf(false) }
    var verdict by remember { mutableStateOf<Verdict?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun runCheck(input: String) {
        if (input.isBlank()) return
        loading = true; error = null; verdict = null
        GuarduraiApi.check(input)
            .onSuccess { verdict = it }
            .onFailure { error = it.message }
        loading = false
    }

    // Auto-check when opened from a share.
    LaunchedEffect(Unit) {
        if (initialText.isNotBlank()) runCheck(initialText)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text("🛡️ Guardurai", fontSize = 26.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
        Text(
            "Paste anything suspicious — a message, link, or phone number — and find out if it's a scam.",
            color = Color(0xFF64748B),
            modifier = Modifier.padding(top = 6.dp),
        )

        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            placeholder = { Text("Paste a message, link, or number…") },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 140.dp)
                .padding(top = 16.dp),
        )

        Button(
            onClick = { scope.launch { runCheck(text.trim()) } },
            enabled = text.trim().isNotEmpty() && !loading,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
        ) {
            Text(if (loading) "Checking…" else "Check for scams")
        }

        error?.let {
            Text(it, color = Color(0xFFB91C1C), modifier = Modifier.padding(top = 16.dp))
        }

        verdict?.let { VerdictCard(it) }

        Spacer(Modifier.height(24.dp))
        Text(
            "Guardurai gives guidance, not a guarantee.",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8),
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
fun VerdictCard(v: Verdict) {
    val (label, color) = when (v.riskLevel) {
        "safe" -> "Looks safe" to Color(0xFF10B981)
        "likely_scam" -> "Likely scam" to Color(0xFFEF4444)
        else -> "Suspicious" to Color(0xFFF59E0B)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = color, shape = RoundedCornerShape(50)) {
                    Text(
                        label,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    )
                }
                Spacer(Modifier.weight(1f))
                if (v.confidence > 0) Text("${v.confidence}%", color = Color(0xFF64748B))
            }

            if (v.summary.isNotBlank()) {
                Text(v.summary, modifier = Modifier.padding(top = 12.dp), color = Color(0xFF0F172A))
            }

            if (v.redFlags.isNotEmpty()) {
                Text("Red flags", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 14.dp), color = Color(0xFF0F172A))
                v.redFlags.forEach {
                    Text("•  $it", modifier = Modifier.padding(top = 4.dp), color = Color(0xFF334155))
                }
            }

            if (v.advice.isNotEmpty()) {
                Text("What to do", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 14.dp), color = Color(0xFF0F172A))
                v.advice.forEach {
                    Text("→  $it", modifier = Modifier.padding(top = 4.dp), color = Color(0xFF334155))
                }
            }
        }
    }
}
