package dev.appu.laluzgarage.ui.intake

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import dev.appu.laluzgarage.data.model.WorkshopUser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IntakeWizardScreen(
    advisor: WorkshopUser?,
    onClose: () -> Unit,
    onOpenJobCard: (String) -> Unit,
    viewModel: IntakeViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val currentStep by viewModel.currentStep.collectAsState()
    val createdJob by viewModel.createdJob.collectAsState()
    var showDiscardDialog by remember { mutableStateOf(false) }

    // If intake completed successfully, render success screen directly
    if (currentStep == IntakeStep.SUCCESS && createdJob != null) {
        IntakeSuccessScreen(
            summary = createdJob!!,
            onOpenJobCard = { recordId ->
                viewModel.resetWizard()
                onOpenJobCard(recordId)
            },
            onDismiss = {
                viewModel.resetWizard()
                onClose()
            }
        )
        return
    }

    if (showDiscardDialog) {
        AlertDialog(
            onDismissRequest = { showDiscardDialog = false },
            title = { Text("Discard Intake Draft?", fontWeight = FontWeight.Bold) },
            text = { Text("Any entered customer or vehicle details will be lost. Are you sure you want to exit?") },
            confirmButton = {
                TextButton(onClick = {
                    showDiscardDialog = false
                    viewModel.resetWizard()
                    onClose()
                }) {
                    Text("Discard", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDiscardDialog = false }) {
                    Text("Continue Intake")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Text(
                            text = "Vehicle Intake (${currentStep.stepNumber}/3)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            if (currentStep.stepNumber > 1) {
                                viewModel.previousStep()
                            } else {
                                showDiscardDialog = true
                            }
                        }) {
                            Icon(
                                imageVector = if (currentStep.stepNumber > 1) Icons.AutoMirrored.Filled.ArrowBack else Icons.Default.Close,
                                contentDescription = "Back"
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        titleContentColor = MaterialTheme.colorScheme.onBackground
                    )
                )

                // Linear Step Progress Bar (33%, 66%, 100%)
                val progress = when (currentStep) {
                    IntakeStep.CUSTOMER -> 0.33f
                    IntakeStep.VEHICLE -> 0.66f
                    IntakeStep.JOB -> 1.0f
                    IntakeStep.SUCCESS -> 1.0f
                }
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
        modifier = modifier
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    if (targetState.stepNumber > initialState.stepNumber) {
                        slideInHorizontally { it } + fadeIn() togetherWith slideOutHorizontally { -it } + fadeOut()
                    } else {
                        slideInHorizontally { -it } + fadeIn() togetherWith slideOutHorizontally { it } + fadeOut()
                    }
                },
                label = "IntakeStepTransition"
            ) { step ->
                when (step) {
                    IntakeStep.CUSTOMER -> {
                        Step1CustomerDiscovery(
                            viewModel = viewModel,
                            onProceed = { viewModel.nextStep() }
                        )
                    }

                    IntakeStep.VEHICLE -> {
                        Step2VehicleSelection(
                            viewModel = viewModel,
                            onProceed = { viewModel.nextStep() }
                        )
                    }

                    IntakeStep.JOB -> {
                        Step3JobSpecification(
                            viewModel = viewModel,
                            advisor = advisor
                        )
                    }

                    IntakeStep.SUCCESS -> {
                        // Handled above
                    }
                }
            }
        }
    }
}
