import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFont

Box = Tuple[int, int, int, int]


@dataclass(frozen=True)
class FontSet:
    title: ImageFont.ImageFont
    section: ImageFont.ImageFont
    card_title: ImageFont.ImageFont
    body: ImageFont.ImageFont
    small: ImageFont.ImageFont
    label: ImageFont.ImageFont


@dataclass(frozen=True)
class CardSpec:
    title: str
    bullets: Sequence[str]
    border: str
    fill: str


@dataclass(frozen=True)
class ExternalSpec:
    title: str
    subtitle: str
    bullets: Sequence[str]
    color: str


PALETTE = {
    "canvas_bg": "#F7FAFC",
    "internal_border": "#3D6CB9",
    "internal_fill": "#EAF2FF",
    "external_border": "#868E96",
    "external_fill": "#F1F3F5",
    "presentation_border": "#228BE6",
    "presentation_fill": "#FFFFFF",
    "business_border": "#E8590C",
    "business_fill": "#FFFFFF",
    "data_border": "#2B8A3E",
    "data_fill": "#FFFFFF",
    "laravel_border": "#F08C00",
    "laravel_fill": "#FFF8E8",
    "ai_border": "#2F9E44",
    "ai_fill": "#EFFBEF",
    "text_dark": "#1F2937",
    "text_muted": "#4B5563",
    "arrow_dark": "#334155",
}


def load_fonts() -> FontSet:
    candidates_bold = [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
    ]
    candidates_regular = [
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]

    def first_existing(paths: Iterable[str]) -> str | None:
        for path in paths:
            if Path(path).exists():
                return path
        return None

    bold_path = first_existing(candidates_bold)
    regular_path = first_existing(candidates_regular)

    if bold_path and regular_path:
        return FontSet(
            title=ImageFont.truetype(bold_path, 34),
            section=ImageFont.truetype(bold_path, 24),
            card_title=ImageFont.truetype(bold_path, 20),
            body=ImageFont.truetype(regular_path, 16),
            small=ImageFont.truetype(regular_path, 14),
            label=ImageFont.truetype(regular_path, 14),
        )

    # Final fallback keeps script runnable everywhere.
    fallback = ImageFont.load_default()
    return FontSet(
        title=fallback,
        section=fallback,
        card_title=fallback,
        body=fallback,
        small=fallback,
        label=fallback,
    )


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> Tuple[int, int]:
    x1, y1, x2, y2 = draw.textbbox((0, 0), text, font=font)
    return x2 - x1, y2 - y1


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
) -> List[str]:
    words = text.split()
    if not words:
        return [""]

    lines: List[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        width, _ = text_size(draw, trial, font)
        if width <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_panel(
    draw: ImageDraw.ImageDraw,
    box: Box,
    title: str,
    border: str,
    fill: str,
    title_color: str,
    title_font: ImageFont.ImageFont,
    radius: int = 26,
    border_width: int = 4,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=border, width=border_width)
    tx, ty = box[0] + 24, box[1] + 18
    draw.text((tx, ty), title, fill=title_color, font=title_font)


def draw_card(
    draw: ImageDraw.ImageDraw,
    box: Box,
    spec: CardSpec,
    fonts: FontSet,
    title_color: str | None = None,
) -> None:
    draw.rounded_rectangle(box, radius=14, fill=spec.fill, outline=spec.border, width=2)
    draw.text((box[0] + 16, box[1] + 14), spec.title, fill=title_color or spec.border, font=fonts.card_title)

    y = box[1] + 50
    text_area_width = box[2] - box[0] - 40
    bullet = "- "

    for line in spec.bullets:
        wrapped = wrap_text(draw, line, fonts.body, text_area_width - 18)
        for i, wrapped_line in enumerate(wrapped):
            prefix = bullet if i == 0 else "  "
            draw.text((box[0] + 18, y), prefix + wrapped_line, fill=PALETTE["text_muted"], font=fonts.body)
            y += 24
        y += 2


def draw_external_card(
    draw: ImageDraw.ImageDraw,
    box: Box,
    spec: ExternalSpec,
    fonts: FontSet,
) -> None:
    draw.rounded_rectangle(box, radius=14, fill="#FFFFFF", outline=spec.color, width=2)
    draw.text((box[0] + 16, box[1] + 12), spec.title, fill=spec.color, font=fonts.card_title)
    draw.text((box[0] + 16, box[1] + 44), spec.subtitle, fill=PALETTE["text_dark"], font=fonts.body)

    y = box[1] + 74
    text_area_width = box[2] - box[0] - 36
    for line in spec.bullets:
        wrapped = wrap_text(draw, line, fonts.small, text_area_width - 18)
        for i, wrapped_line in enumerate(wrapped):
            prefix = "- " if i == 0 else "  "
            draw.text((box[0] + 16, y), prefix + wrapped_line, fill=PALETTE["text_muted"], font=fonts.small)
            y += 20
        y += 2


def arrow_head(draw: ImageDraw.ImageDraw, point: Tuple[int, int], direction: str, color: str) -> None:
    x, y = point
    size = 10
    half = 6
    if direction == "right":
        pts = [(x, y), (x - size, y - half), (x - size, y + half)]
    elif direction == "left":
        pts = [(x, y), (x + size, y - half), (x + size, y + half)]
    elif direction == "down":
        pts = [(x, y), (x - half, y - size), (x + half, y - size)]
    else:  # up
        pts = [(x, y), (x - half, y + size), (x + half, y + size)]
    draw.polygon(pts, fill=color)


def draw_arrow_label(
    draw: ImageDraw.ImageDraw,
    center: Tuple[int, int],
    text: str,
    font: ImageFont.ImageFont,
    color: str,
) -> None:
    tw, th = text_size(draw, text, font)
    x = center[0] - tw // 2
    y = center[1] - th // 2
    draw.rounded_rectangle(
        (x - 8, y - 4, x + tw + 8, y + th + 5),
        radius=7,
        fill="#FFFFFF",
        outline=color,
        width=1,
    )
    draw.text((x, y), text, fill=color, font=font)


def draw_horizontal_arrow(
    draw: ImageDraw.ImageDraw,
    x1: int,
    x2: int,
    y: int,
    color: str,
    label: str,
    font: ImageFont.ImageFont,
    bidirectional: bool = False,
) -> None:
    draw.line([(x1, y), (x2, y)], fill=color, width=3)
    direction = "right" if x2 > x1 else "left"
    arrow_head(draw, (x2, y), direction, color)
    if bidirectional:
        reverse = "left" if direction == "right" else "right"
        arrow_head(draw, (x1, y), reverse, color)
    draw_arrow_label(draw, ((x1 + x2) // 2, y - 14), label, font, color)


def draw_vertical_arrow(
    draw: ImageDraw.ImageDraw,
    x: int,
    y1: int,
    y2: int,
    color: str,
    label: str,
    font: ImageFont.ImageFont,
    label_side: str = "right",
) -> None:
    draw.line([(x, y1), (x, y2)], fill=color, width=3)
    direction = "down" if y2 > y1 else "up"
    arrow_head(draw, (x, y2), direction, color)

    midpoint = ((y1 + y2) // 2) - 3
    offset = 130
    lx = x + offset if label_side == "right" else x - offset
    draw_arrow_label(draw, (lx, midpoint), label, font, color)


def build_layout(width: int, height: int) -> dict[str, Box | List[Box]]:
    margin = 40
    split_gap = 36
    internal_width = int(width * 0.73)

    internal = (margin, margin, internal_width, height - margin)
    external = (internal_width + split_gap, margin, width - margin, height - margin)

    ix1, iy1, ix2, iy2 = internal
    inner_margin = 30

    presentation = (ix1 + inner_margin, iy1 + 78, ix2 - inner_margin, iy1 + 300)
    business = (ix1 + inner_margin, presentation[3] + 24, ix2 - inner_margin, iy2 - 235)
    data = (ix1 + inner_margin, business[3] + 24, ix2 - inner_margin, iy2 - 30)

    px1, py1, px2, py2 = presentation
    p_mid = (px1 + px2) // 2
    angular = (px1 + 18, py1 + 52, p_mid - 12, py2 - 18)
    flutter = (p_mid + 12, py1 + 52, px2 - 18, py2 - 18)

    bx1, by1, bx2, by2 = business
    b_mid = (bx1 + bx2) // 2
    laravel = (bx1 + 20, by1 + 56, b_mid - 14, by2 - 20)
    ai = (b_mid + 14, by1 + 56, bx2 - 20, by2 - 20)

    dx1, dy1, dx2, dy2 = data
    db = (dx1 + 24, dy1 + 52, dx2 - 24, dy2 - 20)

    ex1, ey1, ex2, ey2 = external
    top = ey1 + 78
    card_gap = 18
    available = ey2 - top - 24
    card_height = (available - (3 * card_gap)) // 4

    cards: List[Box] = []
    y = top
    for _ in range(4):
        cards.append((ex1 + 18, y, ex2 - 18, y + card_height))
        y += card_height + card_gap

    return {
        "internal": internal,
        "external": external,
        "presentation": presentation,
        "business": business,
        "data": data,
        "angular": angular,
        "flutter": flutter,
        "laravel": laravel,
        "ai": ai,
        "db": db,
        "external_cards": cards,
    }


def generate_architecture_diagram(output: Path, width: int, height: int) -> None:
    image = Image.new("RGBA", (width, height), PALETTE["canvas_bg"])
    draw = ImageDraw.Draw(image)
    fonts = load_fonts()
    layout = build_layout(width, height)

    draw_panel(
        draw,
        layout["internal"],  # type: ignore[arg-type]
        title="Internal Architecture",
        border=PALETTE["internal_border"],
        fill=PALETTE["internal_fill"],
        title_color="#123A6E",
        title_font=fonts.title,
    )
    draw_panel(
        draw,
        layout["external"],  # type: ignore[arg-type]
        title="External Tiers",
        border=PALETTE["external_border"],
        fill=PALETTE["external_fill"],
        title_color="#343A40",
        title_font=fonts.title,
    )

    draw_panel(
        draw,
        layout["presentation"],  # type: ignore[arg-type]
        title="Presentation Tier",
        border=PALETTE["presentation_border"],
        fill=PALETTE["presentation_fill"],
        title_color=PALETTE["presentation_border"],
        title_font=fonts.section,
        radius=16,
        border_width=3,
    )
    draw_panel(
        draw,
        layout["business"],  # type: ignore[arg-type]
        title="Business Tier",
        border=PALETTE["business_border"],
        fill=PALETTE["business_fill"],
        title_color=PALETTE["business_border"],
        title_font=fonts.section,
        radius=16,
        border_width=3,
    )
    draw_panel(
        draw,
        layout["data"],  # type: ignore[arg-type]
        title="Data Tier",
        border=PALETTE["data_border"],
        fill=PALETTE["data_fill"],
        title_color=PALETTE["data_border"],
        title_font=fonts.section,
        radius=16,
        border_width=3,
    )

    draw_card(
        draw,
        layout["angular"],  # type: ignore[arg-type]
        CardSpec(
            title="Angular SPA (Web Client)",
            bullets=[
                "Role-based dashboards: admin, owner, member, trainer, nutritionist, receptionist.",
                "Lazy loaded features with route guards and social callback handling.",
                "Angular Material, Tailwind, ApexCharts, ngx-translate.",
            ],
            border="#2B7BE0",
            fill="#F8FBFF",
        ),
        fonts,
        title_color="#1A5FB8",
    )
    draw_card(
        draw,
        layout["flutter"],  # type: ignore[arg-type]
        CardSpec(
            title="Client API Layer",
            bullets=[
                "HTTP client with JWT interceptor (Bearer token + X-Gym-Id context).",
                "Error interceptor handles 401 logout and suspended gym UX state.",
                "Payment modal integrates Stripe.js card confirmation flows.",
            ],
            border="#1695B4",
            fill="#F5FCFD",
        ),
        fonts,
        title_color="#11697F",
    )

    draw_card(
        draw,
        layout["laravel"],  # type: ignore[arg-type]
        CardSpec(
            title="Laravel API Core",
            bullets=[
                "REST API (routes/api.php) with controllers and request validation.",
                "Auth with Laravel Passport (auth:api) and Socialite redirects/callbacks.",
                "Middleware: role checks, gym suspension checks, subscription checks.",
                "Eloquent ORM for persistence.",
                "Queued email verification and scheduled session status sync.",
            ],
            border=PALETTE["laravel_border"],
            fill=PALETTE["laravel_fill"],
        ),
        fonts,
        title_color="#A95A00",
    )
    draw_card(
        draw,
        layout["ai"],  # type: ignore[arg-type]
        CardSpec(
            title="Domain Services and AI",
            bullets=[
                "Core modules: users, gyms, sessions, attendance, products, orders, payments.",
                "Nutrition, messaging, wallets, enrollments, notifications, analytics.",
                "AIService: Hugging Face sentiment/category/recommendation APIs.",
                "AuraAiService: Pollinations text assistant + Gemini image analysis.",
            ],
            border=PALETTE["ai_border"],
            fill=PALETTE["ai_fill"],
        ),
        fonts,
        title_color="#1E7D37",
    )
    draw_card(
        draw,
        layout["db"],  # type: ignore[arg-type]
        CardSpec(
            title="Persistence Layer",
            bullets=[
                "MySQL relational schema (users, gyms, sessions, attendance, payments, wallets...).",
                "Laravel public storage for uploaded media and receipts (/storage).",
                "Queue/cache/session tables with optional Redis runtime support.",
            ],
            border=PALETTE["data_border"],
            fill="#F7FFF9",
        ),
        fonts,
        title_color="#1F7A33",
    )

    external_specs = [
        ExternalSpec(
            title="Payment Gateway",
            subtitle="Stripe API + Stripe.js",
            bullets=("PaymentIntent creation in backend and card confirmation in frontend.",),
            color="#3B82F6",
        ),
        ExternalSpec(
            title="Social OAuth",
            subtitle="Google / Facebook / GitHub",
            bullets=("Socialite redirect + callback flow, then tokenized SPA login.",),
            color="#6366F1",
        ),
        ExternalSpec(
            title="AI Providers",
            subtitle="Hugging Face / Pollinations / Gemini",
            bullets=("Text inference, review analysis, recommendations, and image analysis.",),
            color="#F59E0B",
        ),
        ExternalSpec(
            title="Email Delivery",
            subtitle="SMTP / Mail Transport",
            bullets=("Queued verification emails and transactional notifications.",),
            color="#EF4444",
        ),
    ]

    for box, spec in zip(layout["external_cards"], external_specs, strict=True):  # type: ignore[arg-type]
        draw_external_card(draw, box, spec, fonts)

    internal = layout["internal"]  # type: ignore[assignment]
    presentation = layout["presentation"]  # type: ignore[assignment]
    business = layout["business"]  # type: ignore[assignment]
    data = layout["data"]  # type: ignore[assignment]
    laravel = layout["laravel"]  # type: ignore[assignment]
    ai = layout["ai"]  # type: ignore[assignment]
    cards = layout["external_cards"]  # type: ignore[assignment]

    draw_vertical_arrow(
        draw,
        x=internal[0] + 320,
        y1=presentation[3],
        y2=business[1],
        color=PALETTE["presentation_border"],
        label="REST API Requests",
        font=fonts.label,
        label_side="left",
    )
    draw_vertical_arrow(
        draw,
        x=internal[0] + 500,
        y1=business[1],
        y2=presentation[3],
        color=PALETTE["presentation_border"],
        label="JSON Responses",
        font=fonts.label,
        label_side="right",
    )

    draw_vertical_arrow(
        draw,
        x=laravel[0] + 70,
        y1=laravel[3],
        y2=data[1],
        color=PALETTE["data_border"],
        label="SQL and Eloquent",
        font=fonts.label,
        label_side="right",
    )
    draw_vertical_arrow(
        draw,
        x=ai[2] - 70,
        y1=ai[3],
        y2=data[1],
        color=PALETTE["ai_border"],
        label="Domain Writes",
        font=fonts.label,
        label_side="right",
    )

    for card, spec in zip(cards, external_specs, strict=True):
        y_center = (card[1] + card[3]) // 2
        draw_horizontal_arrow(
            draw,
            x1=business[2],
            x2=card[0],
            y=y_center,
            color=spec.color,
            label="Integration",
            font=fonts.label,
            bidirectional=True,
        )

    caption = "Figure: Real architecture extracted from the current Gym Management System codebase"
    cw, ch = text_size(draw, caption, fonts.small)
    draw.text(((width - cw) // 2, height - ch - 8), caption, fill="#5C6773", font=fonts.small)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a clean architecture diagram (PNG).")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("architecture_logicielle_actual.png"),
        help="Output PNG path.",
    )
    parser.add_argument("--width", type=int, default=1920, help="Image width in pixels.")
    parser.add_argument("--height", type=int, default=1180, help="Image height in pixels.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    generate_architecture_diagram(args.output, args.width, args.height)
    print(f"Architecture diagram generated at: {args.output}")


if __name__ == "__main__":
    main()
