package dev.appu.laluzgarage.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/**
 * The stroke icon set drawn in the design artboards (24-unit grid, round caps and joins).
 * Use with Material's Icon(): the tint recolours the stroke.
 */
object LaluzIcons {

    private fun stroke(name: String, width: Float, vararg paths: String): ImageVector =
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            paths.forEach { d ->
                addPath(
                    pathData = addPathNodes(d),
                    stroke = SolidColor(Color.Black),
                    strokeLineWidth = width,
                    strokeLineCap = StrokeCap.Round,
                    strokeLineJoin = StrokeJoin.Round
                )
            }
        }.build()

    private fun filled(name: String, vararg paths: String): ImageVector =
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            paths.forEach { d -> addPath(pathData = addPathNodes(d), fill = SolidColor(Color.Black)) }
        }.build()

    private fun circle(cx: Float, cy: Float, r: Float) =
        "M${cx - r} ${cy}a$r $r 0 1 0 ${2 * r} 0a$r $r 0 1 0 ${-2 * r} 0"

    val Search by lazy { stroke("Search", 2f, circle(11f, 11f, 7f), "M20 20l-3.5 -3.5") }
    val ArrowBack by lazy { stroke("ArrowBack", 2f, "M19 12H5M12 19l-7 -7 7 -7") }
    val ArrowBackShort by lazy { stroke("ArrowBackShort", 2f, "M19 12H5M11 6l-6 6 6 6") }
    val ArrowForward by lazy { stroke("ArrowForward", 2.4f, "M5 12h14M13 6l6 6 -6 6") }
    val Moon by lazy { stroke("Moon", 2f, "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z") }
    val Sun by lazy {
        stroke(
            "Sun", 2f,
            "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0 -8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4 -1.4M17.7 6.3l1.4 -1.4"
        )
    }
    val Mail by lazy { stroke("Mail", 2f, "M3 5h18v14H3zM3 7l9 6 9 -6") }
    val Eye by lazy {
        stroke("Eye", 2f, "M2 12s3.5 -7 10 -7 10 7 10 7 -3.5 7 -10 7S2 12 2 12zM12 15a3 3 0 1 0 0 -6 3 3 0 0 0 0 6z")
    }
    val EyeOff by lazy {
        stroke(
            "EyeOff", 2f,
            "M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a16.6 16.6 0 0 1 -3.2 4.2M6.6 6.6A16.8 16.8 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.2 -.9M9.9 9.9a3 3 0 0 0 4.2 4.2"
        )
    }
    val Clock by lazy { stroke("Clock", 2f, circle(12f, 12f, 9f), "M12 7v5l3 2") }
    val Check by lazy { stroke("Check", 2.2f, "M5 12l5 5 9 -10") }
    val CheckBold by lazy { stroke("CheckBold", 2.5f, "M5 12l5 5 9 -10") }
    val CheckHeavy by lazy { stroke("CheckHeavy", 3.5f, "M5 12l5 5 9 -10") }
    val ArrowUpRight by lazy { stroke("ArrowUpRight", 2.5f, "M7 17L17 7M8 7h9v9") }
    val Car by lazy {
        stroke(
            "Car", 2f,
            "M3 13l2 -6a2 2 0 0 1 2 -1.5h10a2 2 0 0 1 2 1.5l2 6v4H3z",
            circle(7.5f, 17.5f, 1.5f), circle(16.5f, 17.5f, 1.5f)
        )
    }
    val CarSimple by lazy {
        stroke("CarSimple", 2f, "M3 13l2 -6a2 2 0 0 1 2 -1.5h10a2 2 0 0 1 2 1.5l2 6v4H3zM7.5 17.5h.01M16.5 17.5h.01")
    }
    val Users by lazy {
        stroke(
            "Users", 2f,
            "M9 11.5a3.5 3.5 0 1 0 0 -7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6.5 6.5 0 0 1 3 6"
        )
    }
    val Wrench by lazy {
        stroke("Wrench", 2f, "M14.7 6.3a4 4 0 0 0 -5.4 5.4L3 18l3 3 6.3 -6.3a4 4 0 0 0 5.4 -5.4l-2.5 2.5 -2.4 -.6 -.6 -2.4z")
    }
    val Warning by lazy { stroke("Warning", 2f, "M12 3l10 18H2zM12 10v4M12 17.5v.5") }
    val Grid by lazy { stroke("Grid", 2f, "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z") }
    val Inventory by lazy { stroke("Inventory", 2f, "M3 4h18v5H3zM5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1 -1V9M10 13h4") }
    val Plus by lazy { stroke("Plus", 2.5f, "M12 5v14M5 12h14") }
    val Smartphone by lazy { stroke("Smartphone", 2f, "M9.5 2.5h5a2 2 0 0 1 2 2v15a2 2 0 0 1 -2 2h-5a2 2 0 0 1 -2 -2v-15a2 2 0 0 1 2 -2z", "M11 18.5h2") }
    val Phone by lazy {
        stroke("Phone", 2f, "M5 4h4l2 5 -2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1 -2 2A16 16 0 0 1 3 6a2 2 0 0 1 2 -2z")
    }
    /** The WhatsApp logo (filled glyph), recoloured by the Icon tint. */
    val WhatsApp by lazy {
        filled(
            "WhatsApp",
            "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
        )
    }
    val ArrowDown by lazy { stroke("ArrowDown", 2.2f, "M12 5v14M6 13l6 6 6 -6") }
    val ArrowUp by lazy { stroke("ArrowUp", 2.2f, "M12 19V5M6 11l6 -6 6 6") }
    val Heart by lazy {
        filled(
            "Heart",
            "M12 21.35l-1.45 -1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 .81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78 -3.4 6.86 -8.55 11.54L12 21.35z"
        )
    }
    val SignOut by lazy { stroke("SignOut", 2f, "M9 21H5a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h4M16 17l5 -5 -5 -5M21 12H9") }
    val SwitchUser by lazy {
        stroke("SwitchUser", 2f, "M16 3l4 4 -4 4M20 7H8M8 21l-4 -4 4 -4M4 17h12")
    }
    val Close by lazy { stroke("Close", 2f, "M6 6l12 12M18 6L6 18") }
    val Sort by lazy { stroke("Sort", 2.2f, "M7 4v16M3 16l4 4 4 -4M17 20V4M13 8l4 -4 4 4") }
    val AlertCircle by lazy { stroke("AlertCircle", 2f, circle(12f, 12f, 9f), "M12 8v5M12 16h.01") }
    val Calendar by lazy { stroke("Calendar", 2f, "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4") }
    val ChevronLeft by lazy { stroke("ChevronLeft", 2f, "M15 6l-6 6 6 6") }
    val ChevronRight by lazy { stroke("ChevronRight", 2f, "M9 6l6 6 -6 6") }
    val ChevronDown by lazy { stroke("ChevronDown", 2.2f, "M6 9l6 6 6 -6") }
    val ChevronUp by lazy { stroke("ChevronUp", 2f, "M18 15l-6 -6 -6 6") }
    val Edit by lazy { stroke("Edit", 2f, "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1 -4z") }
    val Share by lazy { stroke("Share", 2f, "M21 5a3 3 0 1 1 -6 0 3 3 0 0 1 6 0zM9 12a3 3 0 1 1 -6 0 3 3 0 0 1 6 0zM21 19a3 3 0 1 1 -6 0 3 3 0 0 1 6 0zM8.6 10.5l6.8 -4M8.6 13.5l6.8 4") }
    val Trash by lazy { stroke("Trash", 2f, "M3 6h18M8 6V4h8v2M6 6l1 14h10l1 -14M10 11v6M14 11v6") }
    val TrashRound by lazy {
        stroke("TrashRound", 2f, "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1 -2 2H8a2 2 0 0 1 -2 -2L5 6M10 11v6M14 11v6")
    }
    val Lock by lazy {
        stroke("Lock", 2f, "M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2v-5a2 2 0 0 1 2 -2zM8 11V8a4 4 0 0 1 8 0v3")
    }

    // Settings
    val User by lazy { stroke("User", 2f, "M20 21v-2a4 4 0 0 0 -4 -4H8a4 4 0 0 0 -4 4v2M12 11a4 4 0 1 0 0 -8 4 4 0 0 0 0 8z") }
    val TrendUp by lazy { stroke("TrendUp", 2f, "M22 7l-8.5 8.5 -5 -5L2 17M16 7h6v6") }
    val Rupee by lazy { stroke("Rupee", 2f, "M6 3h12M6 8h12M6 13l8.5 8M6 13h3M9 13c6.667 0 6.667 -10 0 -10") }
    val CheckCircle by lazy { stroke("CheckCircle", 2f, "M22 11.1V12a10 10 0 1 1 -5.9 -9.1M22 4L12 14l-3 -3") }
    val Arrival by lazy { stroke("Arrival", 2f, "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-4M10 17l5 -5 -5 -5M15 12H3") }
    val Chat by lazy { stroke("Chat", 2f, "M21 12a8.5 8.5 0 0 1 -12.6 7.4L3 21l1.6 -5.2A8.5 8.5 0 1 1 21 12z") }
    val Tag by lazy { stroke("Tag", 2f, "M20.6 13.4l-7.2 7.2a2 2 0 0 1 -2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01") }
    val Sliders by lazy {
        stroke("Sliders", 2f, "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6")
    }
    val Palette by lazy {
        stroke(
            "Palette", 2f,
            "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6 -.7 1.6 -1.7 0 -.4 -.2 -.8 -.4 -1.1 -.3 -.3 -.4 -.7 -.4 -1.1a1.6 1.6 0 0 1 1.7 -1.7h2c3 0 5.5 -2.5 5.5 -5.5C22 6 17.5 2 12 2z",
            circle(13.5f, 6.5f, 0.5f), circle(17.5f, 10.5f, 0.5f), circle(8.5f, 7.5f, 0.5f), circle(6.5f, 12.5f, 0.5f)
        )
    }
    val Download by lazy { stroke("Download", 2f, "M21 15v4a2 2 0 0 1 -2 2H5a2 2 0 0 1 -2 -2v-4M7 10l5 5 5 -5M12 15V3") }
    val ArrowDownToLine by lazy { stroke("ArrowDownToLine", 2.25f, "M12 4v11M7 10l5 5 5 -5M5 20h14") }
    val Undo by lazy { stroke("Undo", 2.25f, "M9 14L4 9l5 -5M4 9h10.5a5.5 5.5 0 0 1 0 11H11") }
    val GitHub by lazy {
        stroke(
            "GitHub", 2f,
            "M15 22v-4a4.8 4.8 0 0 0 -1 -3.5c3 0 6 -2 6 -5.5c0.08 -1.25 -0.27 -2.48 -1 -3.5c0.28 -1.15 0.28 -2.35 0 -3.5c0 0 -1 0 -3 1.5c-2.64 -0.5 -5.36 -0.5 -8 0C6 2 5 2 5 2c-0.3 1.15 -0.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5c-0.39 0.49 -0.68 1.05 -0.85 1.65c-0.17 0.6 -0.22 1.23 -0.15 1.85v4",
            "M9 18c-4.51 2 -5 -2 -7 -2"
        )
    }
    val Refresh by lazy { stroke("Refresh", 2f, "M21 12a9 9 0 1 1 -3 -6.7L21 8M21 3v5h-5") }
    val Shield by lazy { stroke("Shield", 2f, "M12 22s8 -4 8 -10V5l-8 -3 -8 3v7c0 6 8 10 8 10z") }
    val ShieldAlert by lazy { stroke("ShieldAlert", 2f, "M12 22s8 -4 8 -10V5l-8 -3 -8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01") }
    val AlertTriangle by lazy {
        stroke("AlertTriangle", 2f, "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7 -3L13.7 3.9a2 2 0 0 0 -3.4 0zM12 9v4M12 17h.01")
    }
    val SunLarge by lazy {
        stroke(
            "SunLarge", 2f,
            "M12 17a5 5 0 1 0 0 -10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4 -1.4M18.4 5.6l1.4 -1.4"
        )
    }
    val Settings by lazy {
        stroke(
            "Settings", 2f,
            circle(12f, 12f, 3f),
            "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1 .1a2 2 0 1 1 -2.8 2.8l-.1 -.1a1.7 1.7 0 0 0 -1.8 -.3 1.7 1.7 0 0 0 -1 1.5V21a2 2 0 1 1 -4 0v-.1a1.7 1.7 0 0 0 -1.1 -1.5 1.7 1.7 0 0 0 -1.8 .3l-.1 .1a2 2 0 1 1 -2.8 -2.8l.1 -.1a1.7 1.7 0 0 0 .3 -1.8 1.7 1.7 0 0 0 -1.5 -1H3a2 2 0 1 1 0 -4h.1a1.7 1.7 0 0 0 1.5 -1.1 1.7 1.7 0 0 0 -.3 -1.8l-.1 -.1a2 2 0 1 1 2.8 -2.8l.1 .1a1.7 1.7 0 0 0 1.8 .3H9a1.7 1.7 0 0 0 1 -1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8 -.3l.1 -.1a2 2 0 1 1 2.8 2.8l-.1 .1a1.7 1.7 0 0 0 -.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0 -1.5 1z"
        )
    }

    /** The multi-colour Google "G" on a 48-unit grid. Draw with tint = Color.Unspecified. */
    val GoogleG: ImageVector by lazy {
        ImageVector.Builder("GoogleG", 14.dp, 14.dp, 48f, 48f).apply {
            addPath(
                addPathNodes("M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85 -6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"),
                fill = SolidColor(Color(0xFFEA4335))
            )
            addPath(
                addPathNodes("M46.98 24.55c0 -1.57 -.15 -3.09 -.38 -4.55H24v9.02h12.94c-.58 2.96 -2.26 5.48 -4.78 7.18l7.73 6c4.51 -4.18 7.09 -10.36 7.09 -17.65z"),
                fill = SolidColor(Color(0xFF4285F4))
            )
            addPath(
                addPathNodes("M10.53 28.59c-.48 -1.45 -.76 -2.99 -.76 -4.59s.27 -3.14 .76 -4.59l-7.98 -6.19C.92 16.46 0 20.12 0 24c0 3.88 .92 7.54 2.56 10.78l7.97 -6.19z"),
                fill = SolidColor(Color(0xFFFBBC05))
            )
            addPath(
                addPathNodes("M24 48c6.48 0 11.93 -2.13 15.89 -5.81l-7.73 -6c-2.15 1.45 -4.92 2.3 -8.16 2.3 -6.26 0 -11.57 -4.22 -13.47 -9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"),
                fill = SolidColor(Color(0xFF34A853))
            )
        }.build()
    }
}
