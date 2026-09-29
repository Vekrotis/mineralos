#!/bin/bash

# Kontrola spuštění s právy root
if [ "$EUID" -ne 0 ]; then 
  echo "Prosím spusťte skript přes: sudo bash start.sh"
  exit 1
fi

# V Live USB Mintu je výchozí uživatel "mint"
LIVE_USER=${SUDO_USER:-mint}
# Zjištění složky, ze které se skript spouští (Ventoy disk)
SCRIPT_DIR=$(dirname "$(realpath "$0")")

echo "=== 1. Aktualizace balíčků ==="
# apt-get upgrade na starém PC může sežrat dost RAM (Live USB ukládá změny do RAM)
# Pokud by se PC zasekávalo kvůli paměti, smaž '&& apt-get upgrade -y'
apt-get update && apt-get upgrade -y

echo "=== 2. Odstranění Firefoxu a vyčištění ==="
apt-get purge -y firefox*
apt-get autoremove -y

echo "=== 3. Instalace Brave Browseru ==="
curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | tee /etc/apt/sources.list.d/brave-browser-release.list
apt-get update
apt-get install -y brave-browser

# Nastavení Brave jako výchozího prohlížeče
sudo -u $LIVE_USER xdg-settings set default-web-browser brave-browser.desktop

echo "=== 4. Instalace Javy (ATLauncher) a Node.js ==="
apt-get install -y default-jre
curl -fsSL https://deb.nodesource.com/setup_current.x | bash -
apt-get install -y nodejs
npm install -g npm@latest

echo "=== 5. Osekání klávesnice na EN a CZ ==="
# Okamžitá změna v běžícím okně (X11)
setxkbmap us,cz
# Uložení do nastavení prostředí Cinnamon
sudo -u $LIVE_USER gsettings set org.gnome.libgnomekbd.keyboard layouts "['us', 'cz']"

echo "=== 6. Nastavení vlastní tapety ==="
if [ -f "$SCRIPT_DIR/tapeta.jpg" ]; then
    # Zkopíruje tapetu z flashky do domovské složky Live uživatele
    cp "$SCRIPT_DIR/tapeta.jpg" "/home/$LIVE_USER/Pictures/tapeta.jpg"
    chown $LIVE_USER:$LIVE_USER "/home/$LIVE_USER/Pictures/tapeta.jpg"
    sudo -u $LIVE_USER gsettings set org.cinnamon.desktop.background picture-uri "file:///home/$LIVE_USER/Pictures/tapeta.jpg"
    echo "Tapeta úspěšně změněna."
else
    echo "Soubor tapeta.jpg nebyl ve složce se skriptem nalezen. Tapeta zůstává výchozí."
fi

echo "=== 7. Skript pro diagnostiku školní sítě ==="
MENU_SCRIPT="/usr/local/bin/net-check"

cat << 'EOF' > $MENU_SCRIPT
#!/bin/bash
while true; do
    clear
    echo "=========================================="
    echo "         DIAGNOSTIKA SÍTĚ (ISŠ)           "
    echo "=========================================="
    echo "1. Zobrazit aktuální IP adresu"
    echo "2. Zkontrolovat připojení (Ping 8.8.8.8)"
    echo "3. Zkontrolovat školní bránu (Ping 192.168.1.1)"
    echo "4. Restartovat NetworkManager"
    echo "5. Konec"
    echo "=========================================="
    read -p "Vyberte možnost (1-5): " choice

    case $choice in
        1) ip a | grep 'inet ' ;;
        2) ping -c 4 8.8.8.8 ;;
        3) ping -c 4 192.168.1.1 ;; 
        4) sudo systemctl restart NetworkManager && echo "Síťový modul restartován." ;;
        5) exit 0 ;;
        *) echo "Neplatná volba." ;;
    esac
    read -p "Stiskněte Enter pro pokračování..."
done
EOF

chmod +x $MENU_SCRIPT

# Zástupce rovnou na plochu
DESKTOP_FILE="/home/$LIVE_USER/Desktop/NetCheck.desktop"
cat << EOF > $DESKTOP_FILE
[Desktop Entry]
Name=Kontrola sítě
Comment=Spustí menu pro kontrolu sítě
Exec=gnome-terminal -- /usr/local/bin/net-check
Icon=network-transmit-receive
Terminal=false
Type=Application
EOF
chmod +x $DESKTOP_FILE
chown $LIVE_USER:$LIVE_USER $DESKTOP_FILE

echo "=== 8. Čištění ==="
apt-get clean

echo ""
echo "Vše je připraveno! Můžeš začít pracovat."