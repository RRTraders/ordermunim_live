from PIL import Image, ImageDraw
import os

source_path = r"C:\Users\Mahakal\.gemini\antigravity\brain\7d3e1dbc-b6b8-4e1a-97b1-43ec7a3150ea\.user_uploaded\media_1791089731456.jpg"
img = Image.open(source_path).convert("RGBA")

# Ensure public dir exists
public_dir = r"E:\Projects\Meesho OTP\web-app\public"
os.makedirs(public_dir, exist_ok=True)

# 1. Save web logo and favicon
img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "logo.png"), "PNG")
img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "favicon.png"), "PNG")
print("Saved web logo.png and favicon.png")

# Helper to create circular icon
def make_round(im, size):
    im_resized = im.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    result = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    result.paste(im_resized, (0, 0), mask)
    return result

# Helper to create foreground adaptive icon with safe zone padding
def make_foreground(im, canvas_size):
    # Android adaptive icon foreground is canvas_size x canvas_size (e.g. 432x432)
    # The visible safe area is inner ~66-72%
    fg = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    inner_size = int(canvas_size * 0.72)
    im_inner = im.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    offset = (canvas_size - inner_size) // 2
    fg.paste(im_inner, (offset, offset))
    return fg

# Android icon dimensions: (folder, launcher_size, foreground_size)
densities = [
    ("mipmap-mdpi", 48, 108),
    ("mipmap-hdpi", 72, 162),
    ("mipmap-xhdpi", 96, 216),
    ("mipmap-xxhdpi", 144, 324),
    ("mipmap-xxxhdpi", 192, 432),
]

res_dir = r"E:\Projects\Meesho OTP\web-app\android\app\src\main\res"

for folder, launcher_sz, fg_sz in densities:
    target_dir = os.path.join(res_dir, folder)
    os.makedirs(target_dir, exist_ok=True)

    # 1. Standard square launcher
    sq = img.resize((launcher_sz, launcher_sz), Image.Resampling.LANCZOS)
    sq.save(os.path.join(target_dir, "ic_launcher.png"), "PNG")

    # 2. Round launcher
    rnd = make_round(img, launcher_sz)
    rnd.save(os.path.join(target_dir, "ic_launcher_round.png"), "PNG")

    # 3. Foreground adaptive icon
    fg = make_foreground(img, fg_sz)
    fg.save(os.path.join(target_dir, "ic_launcher_foreground.png"), "PNG")

    print(f"Generated icons for {folder}: {launcher_sz}x{launcher_sz} and fg {fg_sz}x{fg_sz}")

print("All Android & Web icons successfully generated!")
