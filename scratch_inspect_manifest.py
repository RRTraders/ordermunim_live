import re

with open('sku_apk_inspect/AndroidManifest.xml', 'rb') as f:
    text = f.read().decode('utf-8', errors='ignore')

print('--- PERMISSIONS ---')
for p in re.findall(r'<uses-permission\s+android:name="([^"]+)"', text):
    print(p)

print('\n--- SERVICES & RECEIVERS ---')
for tag in ['service', 'receiver']:
    for m in re.finditer(r'<' + tag + r'[^>]+android:name="([^"]+)"', text):
        print(f'{tag}: {m.group(1)}')
