#!/usr/bin/env python3
"""
Device Certificate Generation Script for mTLS Authentication

Usage:
    python generate_device_certificates.py --ca-only         # Generate CA only
    python generate_device_certificates.py --device "device-name"  # Generate device cert
    python generate_device_certificates.py --all             # Generate CA + devices
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
import hashlib


# Configuration
CERTS_DIR = Path(__file__).parent.parent / "certs"
CA_KEY = CERTS_DIR / "ca-key.pem"
CA_CERT = CERTS_DIR / "ca-cert.pem"
CA_CONFIG = CERTS_DIR / "ca.conf"
DEVICE_DIR = CERTS_DIR / "devices"


def setup_directories():
    """Create necessary directories."""
    CERTS_DIR.mkdir(exist_ok=True)
    DEVICE_DIR.mkdir(exist_ok=True)
    print(f"✓ Directories ready: {CERTS_DIR}")


def create_ca_config():
    """Create CA configuration file."""
    config = """[ ca ]
default_ca = CA_default

[ CA_default ]
dir              = .
certs            = $dir/certs
crl_dir          = $dir/crl
new_certs_dir    = $dir/newcerts
database         = $dir/index.txt
serial           = $dir/serial
RANDFILE         = $dir/private/.rand
private_key      = $dir/ca-key.pem
certificate      = $dir/ca-cert.pem
crlnumber        = $dir/crlnumber
crl              = $dir/crl.pem
crl_extensions   = crl_ext
default_crl_days = 30
default_md       = sha256
name_opt         = ca_default
cert_opt         = ca_default
policy           = policy_loose
email_in_dn      = no

[ policy_strict ]
countryName             = match
stateOrProvinceName     = match
organizationName        = match
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ policy_loose ]
countryName             = optional
stateOrProvinceName     = optional
localityName            = optional
organizationName        = optional
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ req ]
default_bits        = 2048
distinguished_name  = req_distinguished_name
string_mask         = utf8only
default_md          = sha256
x509_extensions     = v3_ca

[ req_distinguished_name ]
countryName                     = Country Name (2 letter code)
stateOrProvinceName             = State or Province Name
localityName                    = Locality Name
0.organizationName              = Organization Name
organizationalUnitName          = Organizational Unit Name
commonName                      = Common Name
emailAddress                    = Email Address

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ v3_intermediate_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ v3_device ]
basicConstraints = CA:FALSE
nsCertType = client, server
nsComment = "Device Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
"""
    CA_CONFIG.write_text(config)
    print(f"✓ CA configuration created: {CA_CONFIG}")


def generate_ca():
    """Generate Certificate Authority."""
    print("\n=== Generating Certificate Authority ===")

    # Generate CA private key
    if not CA_KEY.exists():
        cmd = [
            "openssl", "genrsa",
            "-out", str(CA_KEY),
            "4096"
        ]
        subprocess.run(cmd, check=True)
        print(f"✓ Generated CA private key: {CA_KEY}")
    else:
        print(f"⚠ CA private key already exists: {CA_KEY}")

    # Generate CA certificate
    if not CA_CERT.exists():
        cmd = [
            "openssl", "req",
            "-new", "-x509",
            "-days", "3650",
            "-key", str(CA_KEY),
            "-out", str(CA_CERT),
            "-subj", "/C=US/ST=State/L=City/O=RaptorX/CN=RaptorX-CA"
        ]
        subprocess.run(cmd, check=True)
        print(f"✓ Generated CA certificate: {CA_CERT}")
    else:
        print(f"⚠ CA certificate already exists: {CA_CERT}")

    # Display CA info
    cmd = ["openssl", "x509", "-in", str(CA_CERT), "-text", "-noout"]
    subprocess.run(cmd)


def generate_device_cert(device_name: str, device_cn: str = None):
    """Generate device certificate signed by CA."""
    if device_cn is None:
        device_cn = device_name

    print(f"\n=== Generating Device Certificate: {device_name} ===")

    device_dir = DEVICE_DIR / device_name
    device_dir.mkdir(exist_ok=True)

    device_key = device_dir / f"{device_name}.key.pem"
    device_csr = device_dir / f"{device_name}.csr.pem"
    device_cert = device_dir / f"{device_name}.cert.pem"
    device_config = device_dir / f"{device_name}.conf"

    # Create device config
    config = f"""[ req ]
default_bits        = 2048
distinguished_name  = req_distinguished_name
req_extensions      = v3_req
default_md          = sha256
string_mask         = utf8only

[ req_distinguished_name ]
countryName                     = Country Name (2 letter code)
stateOrProvinceName             = State or Province Name
localityName                    = Locality Name
0.organizationName              = Organization Name
organizationalUnitName          = Organizational Unit Name
commonName                      = Common Name
emailAddress                    = Email Address

[ v3_req ]
basicConstraints = CA:FALSE
nsCertType = client, server
nsComment = "Device Certificate"
subjectKeyIdentifier = hash
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
"""
    device_config.write_text(config)

    # Generate device private key
    if not device_key.exists():
        cmd = ["openssl", "genrsa", "-out", str(device_key), "2048"]
        subprocess.run(cmd, check=True)
        print(f"✓ Generated device private key: {device_key}")
    else:
        print(f"⚠ Device private key already exists: {device_key}")

    # Generate device CSR
    if not device_csr.exists():
        cmd = [
            "openssl", "req",
            "-new",
            "-key", str(device_key),
            "-out", str(device_csr),
            "-config", str(device_config),
            "-subj", f"/C=US/ST=State/L=City/O=RaptorX/CN={device_cn}"
        ]
        subprocess.run(cmd, check=True)
        print(f"✓ Generated device CSR: {device_csr}")
    else:
        print(f"⚠ Device CSR already exists: {device_csr}")

    # Sign device certificate with CA
    if not device_cert.exists():
        cmd = [
            "openssl", "x509",
            "-req",
            "-in", str(device_csr),
            "-CA", str(CA_CERT),
            "-CAkey", str(CA_KEY),
            "-CAcreateserial",
            "-out", str(device_cert),
            "-days", "365",
            "-sha256",
            "-extensions", "v3_req",
            "-extfile", str(device_config)
        ]
        subprocess.run(cmd, check=True)
        print(f"✓ Generated device certificate: {device_cert}")
    else:
        print(f"⚠ Device certificate already exists: {device_cert}")

    # Calculate fingerprint (SHA256)
    with open(device_cert, "rb") as f:
        cert_data = f.read()
        fingerprint = hashlib.sha256(cert_data).hexdigest()

    # Extract subject DN
    cmd = ["openssl", "x509", "-in", str(device_cert), "-noout", "-subject"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    subject_dn = result.stdout.strip().replace("subject=", "")

    print(f"\n📋 Device Certificate Details:")
    print(f"   Name: {device_name}")
    print(f"   CN: {device_cn}")
    print(f"   Fingerprint (SHA256): {fingerprint}")
    print(f"   Subject DN: {subject_dn}")
    print(f"   Key: {device_key}")
    print(f"   Cert: {device_cert}")
    print(f"   CA: {CA_CERT}")

    # Display certificate info
    cmd = ["openssl", "x509", "-in", str(device_cert), "-text", "-noout"]
    subprocess.run(cmd)

    return {
        "device_name": device_name,
        "fingerprint": fingerprint,
        "subject_dn": subject_dn,
        "key_path": str(device_key),
        "cert_path": str(device_cert),
        "ca_path": str(CA_CERT),
    }


def register_device_with_backend(device_info: dict, access_point_id: int, api_base_url: str = "http://localhost:8000"):
    """Register device certificate with backend API."""
    import json
    import requests

    print(f"\n=== Registering Device with Backend ===")
    print(f"   Device: {device_info['device_name']}")
    print(f"   Access Point ID: {access_point_id}")
    print(f"   API: {api_base_url}")

    # Prepare registration payload
    payload = {
        "access_point_id": access_point_id,
        "device_name": device_info["device_name"],
        "cert_fingerprint": device_info["fingerprint"],
        "subject_dn": device_info["subject_dn"],
    }

    # Register via API (requires auth token)
    headers = {
        "Content-Type": "application/json",
        # Note: You need to provide a valid JWT token here
        "Authorization": "Bearer YOUR_JWT_TOKEN_HERE"
    }

    try:
        response = requests.post(
            f"{api_base_url}/api/devices/register",
            json=payload,
            headers=headers,
            timeout=10
        )
        if response.status_code == 201:
            print(f"✓ Device registered successfully")
            print(f"  Response: {response.json()}")
        else:
            print(f"⚠ Registration failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"⚠ Could not connect to backend: {e}")
        print(f"  Note: Register device manually via API after obtaining JWT token")


def main():
    parser = argparse.ArgumentParser(
        description="Generate and manage device certificates for mTLS"
    )
    parser.add_argument("--ca-only", action="store_true", help="Generate CA only")
    parser.add_argument("--device", type=str, help="Generate specific device certificate")
    parser.add_argument("--all", action="store_true", help="Generate CA + all sample devices")
    parser.add_argument("--register", action="store_true", help="Register devices with backend")
    parser.add_argument("--api-url", type=str, default="http://localhost:8000", help="Backend API URL")

    args = parser.parse_args()

    try:
        setup_directories()
        create_ca_config()

        if args.ca_only or args.all or args.device:
            generate_ca()

        if args.device:
            device_info = generate_device_cert(args.device)
            if args.register:
                register_device_with_backend(device_info, access_point_id=1, api_base_url=args.api_url)

        elif args.all:
            # Generate sample devices
            sample_devices = [
                ("device-001", "Main-Gate-Reader"),
                ("device-002", "Building-A-Entry"),
                ("device-003", "Server-Room-Access"),
            ]
            for device_name, device_cn in sample_devices:
                device_info = generate_device_cert(device_name, device_cn)
                if args.register:
                    access_point_id = {
                        "device-001": 1,
                        "device-002": 2,
                        "device-003": 3,
                    }.get(device_name, 1)
                    register_device_with_backend(device_info, access_point_id=access_point_id, api_base_url=args.api_url)

        print("\n✓ Certificate generation complete!")
        print(f"  Certificates stored in: {CERTS_DIR}")
        print(f"  CA: {CA_CERT}")
        print(f"  Devices: {DEVICE_DIR}")

    except subprocess.CalledProcessError as e:
        print(f"✗ Error running OpenSSL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
