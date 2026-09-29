#!/bin/bash

# Automatické povýšení na root bez nutnosti zadávat 'sudo' ručně
if [ "$EUID" -ne 0 ]; then
    exec sudo bash "$0" "$@"
fi

echo "================================================="
echo "  [*] Inicializace MineralOS prostredi..."
echo "================================================="

# 1. Výkon procesoru a optimalizace RAM
echo "[>] 1/4 Nastavovani systemu na maximalni vykon..."
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    [ -f "$cpu" ] && echo "performance" > "$cpu" 2>/dev/null
done
# Zabránění zbytečnému zápisu na pomalý flash disk (šetří overlay paměť)
sysctl vm.swappiness=10 > /dev/null 2>&1
echo "    [+] Procesor a sprava pameti nastaveny na 'fast'."

# 2. Instalace a ověření Node.js + NPM
echo "[>] 2/4 Priprava Node.js a NPM..."
curl -fsSL https://deb.nodesource.com/setup_current.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1

# Kontrola a záložní fallback, pokud by se NPM nenainstalovalo
if ! command -v npm &> /dev/null; then
    echo "    [!] NPM nebylo detekovano, spoustim zalozni instalaci z APT..."
    apt-get update > /dev/null 2>&1
    apt-get install -y npm nodejs > /dev/null 2>&1
fi

NODE_VER=$(node -v 2>/dev/null || echo "chyba")
NPM_VER=$(npm -v 2>/dev/null || echo "chyba")
echo "    [+] Pripraveno: Node $NODE_VER | NPM $NPM_VER"

# 3. Čištění systému pro úsporu místa v paměti Live USB
echo "[>] 3/4 Cisteni docasnych souboru a zbytecnych balicku..."
apt-get autoremove -y > /dev/null 2>&1
apt-get clean > /dev/null 2>&1
journalctl --vacuum-time=1d > /dev/null 2>&1
rm -rf ~/.cache/* 2>/dev/null
echo "    [+] Cache promazana a misto v RAM uvolneno."

# 4. Instalace vlastního CLI
echo "[>] 4/4 Instalace MineralOS CLI balicku..."
npm install -g mineralos --silent

echo ""
echo "================================================="
echo "  [+] HOTOVO! MineralOS je pripraven k pouziti."
echo "  [>] Otevri terminal a napis: mineral"
echo "================================================="
echo ""
read -p "Stiskni [Enter] pro ukonceni instalatoru..."