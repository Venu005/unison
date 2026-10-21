#!/bin/bash
# Creates the self-signed "MacDroid Self-Signed" code-signing identity in the login keychain (once per Mac).
#
# Every MacDroid build is signed with it, so macOS knows the app by its bundle id and this certificate rather than
# by a hash of one build. Keychain "Always Allow" then survives rebuilds and updates.
# Ship every release with the same certificate: export it (Keychain Access → My Certificates → Export) and keep the
# .p12 somewhere safe. A new certificate means one more keychain prompt for every user after their next update.
set -euo pipefail

NAME="MacDroid Self-Signed"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

if security find-certificate -c "$NAME" "$KEYCHAIN" >/dev/null 2>&1; then
    echo "\"$NAME\" is already in the login keychain."
    exit 0
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
PASS="$(uuidgen)"

cat > "$WORK/cert.cnf" <<EOF
[req]
distinguished_name = dn
x509_extensions = ext
prompt = no
[dn]
CN = $NAME
[ext]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
EOF

# /usr/bin/openssl (LibreSSL) writes a PKCS#12 that `security import` accepts.
/usr/bin/openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -config "$WORK/cert.cnf" -keyout "$WORK/key.pem" -out "$WORK/cert.pem" 2>/dev/null
/usr/bin/openssl pkcs12 -export -inkey "$WORK/key.pem" -in "$WORK/cert.pem" \
    -name "$NAME" -passout "pass:$PASS" -out "$WORK/identity.p12"

# -T: codesign may use the key without asking.
security import "$WORK/identity.p12" -k "$KEYCHAIN" -P "$PASS" -T /usr/bin/codesign
echo "Created \"$NAME\". Back it up from Keychain Access (My Certificates → Export)."
