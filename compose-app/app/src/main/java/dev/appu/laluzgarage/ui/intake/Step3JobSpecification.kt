package dev.appu.laluzgarage.ui.intake

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.ui.theme.LocalWorkshopColors

val CommonPresetTasks = listOf(
    "General Service",
    "Engine Oil & Filter",
    "Front Brake Pads",
    "Wheel Alignment & Balancing",
    "AC Filter & Cooling Check",
    "Suspension Inspection",
    "Battery Health Diagnostic"
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Step3JobSpecification(
    viewModel: IntakeViewModel,
    advisor: WorkshopUser?,
    modifier: Modifier = Modifier
) {
    val mileage by viewModel.inputMileage.collectAsState()
    val isDead by viewModel.isDeadVehicle.collectAsState()
    val expectedDelivery by viewModel.expectedDeliveryDate.collectAsState()
    val tasks by viewModel.taskList.collectAsState()
    val personalItems by viewModel.inputPersonalItems.collectAsState()
    val remarks by viewModel.inputRemarks.collectAsState()

    val isSubmitting by viewModel.isSubmitting.collectAsState()
    val submissionError by viewModel.submissionError.collectAsState()

    var customTaskInput by remember { mutableStateOf("") }
    val workshopColors = LocalWorkshopColors.current
    val scrollState = rememberScrollState()

    val canSubmit = (isDead || mileage.isNotBlank()) && (tasks.isNotEmpty() || customTaskInput.isNotBlank())

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "STEP 3: JOB SPECIFICATION",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )

        Text(
            text = "Work Order & Inspection",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        // Error Banner
        AnimatedVisibility(visible = !submissionError.isNullOrEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(workshopColors.statusUrgent.copy(alpha = 0.12f))
                    .border(1.dp, workshopColors.statusUrgent.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = workshopColors.statusUrgent)
                Spacer(modifier = Modifier.width(10.dp))
                Text(submissionError ?: "", color = workshopColors.statusUrgent, fontSize = 12.sp)
            }
        }

        // 1. Mileage & Dead Vehicle Section
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ) {
            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Dead / Inoperable Vehicle", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text("Vehicle cannot start or odometer is blank", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = isDead,
                        onCheckedChange = { viewModel.isDeadVehicle.value = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.primary)
                    )
                }

                if (!isDead) {
                    OutlinedTextField(
                        value = mileage,
                        onValueChange = { viewModel.inputMileage.value = it },
                        label = { Text("Current Odometer Mileage (km)") },
                        placeholder = { Text("e.g. 45200") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                OutlinedTextField(
                    value = expectedDelivery,
                    onValueChange = { viewModel.expectedDeliveryDate.value = it },
                    label = { Text("Estimated Delivery Date (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        }

        // 2. Repair Checklist & Tasks Preset Section
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ) {
            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Quick Task Presets",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                // Quick Task Preset Chips
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CommonPresetTasks.forEach { preset ->
                        val isAdded = tasks.contains(preset)
                        FilterChip(
                            selected = isAdded,
                            onClick = {
                                if (isAdded) viewModel.removeTask(preset)
                                else viewModel.addTask(preset)
                            },
                            label = { Text(preset, fontSize = 11.sp) },
                            leadingIcon = if (isAdded) {
                                { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp)) }
                            } else null,
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f),
                                selectedLabelColor = MaterialTheme.colorScheme.primary
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }

                // Custom Task Adder
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = customTaskInput,
                        onValueChange = { customTaskInput = it },
                        placeholder = { Text("Custom repair item...") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            if (customTaskInput.isNotBlank()) {
                                viewModel.addTask(customTaskInput)
                                customTaskInput = ""
                            }
                        },
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Add", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                }

                // Selected Tasks List
                if (tasks.isNotEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        tasks.forEach { t ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp, horizontal = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("• $t", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                                IconButton(onClick = { viewModel.removeTask(t) }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Close, contentDescription = "Remove", modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Personal Items & Remarks
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ) {
            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = personalItems,
                    onValueChange = { viewModel.inputPersonalItems.value = it },
                    label = { Text("Customer Belongings / Personal Items in Vehicle") },
                    placeholder = { Text("e.g. Fastag, Sunglasses in glovebox, USB pen drive") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = remarks,
                    onValueChange = { viewModel.inputRemarks.value = it },
                    label = { Text("Advisor Handover Remarks / Scratches Noted") },
                    placeholder = { Text("e.g. Dent on left rear door, customer requested evening delivery.") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Submit Button
        Button(
            onClick = {
                if (customTaskInput.isNotBlank()) {
                    viewModel.addTask(customTaskInput)
                    customTaskInput = ""
                }
                viewModel.submitIntake(advisor)
            },
            enabled = canSubmit && !isSubmitting,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            )
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    color = MaterialTheme.colorScheme.onPrimary,
                    strokeWidth = 2.5.dp
                )
            } else {
                Text("Authorize & Create Job Card", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}
