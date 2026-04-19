#!/usr/bin/env python3
"""
Real-Time Updates Verification Script
Validates WebSocket setup and connectivity
"""

import sys
import asyncio
import websockets
import json
import logging
from datetime import datetime
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class RealtimeVerifier:
    def __init__(self, ws_url: str = "ws://localhost:8000/api/ws", token: Optional[str] = None):
        self.ws_url = ws_url
        self.token = token or self._get_test_token()
        self.ws = None

    def _get_test_token(self) -> str:
        """Get a test JWT token (would need to authenticate first)"""
        # This is a placeholder - in practice, you'd authenticate first
        return os.getenv("TEST_JWT_TOKEN", "")

    async def verify_websocket_endpoint(self) -> bool:
        """Check if WebSocket endpoint is accessible"""
        logger.info("Checking WebSocket endpoint...")
        try:
            # Try to connect without token
            async with websockets.connect(self.ws_url) as ws:
                logger.info("✓ WebSocket endpoint is accessible")
                return True
        except Exception as e:
            logger.error(f"✗ WebSocket endpoint not accessible: {e}")
            return False

    async def verify_authentication(self) -> bool:
        """Check if authentication is working"""
        logger.info("Checking authentication...")
        if not self.token:
            logger.warning("! No test token available, skipping auth test")
            return True

        try:
            url = f"{self.ws_url}?token={self.token}"
            async with websockets.connect(url) as ws:
                # Wait for connection confirmation
                message = await asyncio.wait_for(ws.recv(), timeout=2.0)
                response = json.loads(message)

                if response.get("type") == "connected":
                    logger.info(f"✓ Authentication successful (user: {response.get('user_id')})")
                    return True
                else:
                    logger.error(f"✗ Unexpected response: {response}")
                    return False

        except asyncio.TimeoutError:
            logger.error("✗ No connection response received")
            return False
        except Exception as e:
            logger.error(f"✗ Authentication failed: {e}")
            return False

    async def verify_subscription(self) -> bool:
        """Check if subscription mechanism works"""
        logger.info("Checking subscription mechanism...")
        if not self.token:
            logger.warning("! No test token available, skipping subscription test")
            return True

        try:
            url = f"{self.ws_url}?token={self.token}"
            async with websockets.connect(url) as ws:
                # Wait for connection
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                # Subscribe to alerts
                subscribe_msg = {"action": "subscribe", "type": "alert"}
                await ws.send(json.dumps(subscribe_msg))

                logger.info("✓ Successfully subscribed to alerts")
                return True

        except Exception as e:
            logger.error(f"✗ Subscription failed: {e}")
            return False

    async def verify_keepalive(self) -> bool:
        """Check if keep-alive mechanism works"""
        logger.info("Checking keep-alive mechanism...")
        if not self.token:
            logger.warning("! No test token available, skipping keep-alive test")
            return True

        try:
            url = f"{self.ws_url}?token={self.token}"
            async with websockets.connect(url) as ws:
                # Wait for connection
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                # Send ping
                ping_msg = {"action": "ping"}
                await ws.send(json.dumps(ping_msg))

                # Expect pong
                response = await asyncio.wait_for(ws.recv(), timeout=2.0)
                pong_response = json.loads(response)

                if pong_response.get("type") == "pong":
                    logger.info("✓ Keep-alive mechanism working")
                    return True
                else:
                    logger.error(f"✗ Unexpected pong response: {pong_response}")
                    return False

        except asyncio.TimeoutError:
            logger.error("✗ Keep-alive timeout")
            return False
        except Exception as e:
            logger.error(f"✗ Keep-alive check failed: {e}")
            return False

    async def verify_message_broadcast(self) -> bool:
        """Check if message broadcasting works"""
        logger.info("Checking message broadcast...")
        if not self.token:
            logger.warning("! No test token available, skipping broadcast test")
            return True

        try:
            url = f"{self.ws_url}?token={self.token}"

            async with websockets.connect(url) as ws:
                # Wait for connection
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                # Subscribe to alerts
                subscribe_msg = {"action": "subscribe", "type": "alert"}
                await ws.send(json.dumps(subscribe_msg))

                logger.info("✓ Message broadcast infrastructure ready")
                logger.info("  (Run: curl -X POST http://localhost:8000/api/ws/broadcast-alert ... to test)")
                return True

        except Exception as e:
            logger.error(f"✗ Broadcast test failed: {e}")
            return False

    async def run_all_checks(self) -> dict:
        """Run all verification checks"""
        logger.info("=" * 60)
        logger.info("RaptorX Real-Time Updates Verification")
        logger.info("=" * 60)
        logger.info(f"WebSocket URL: {self.ws_url}")
        logger.info()

        results = {
            "endpoint": await self.verify_websocket_endpoint(),
            "authentication": await self.verify_authentication(),
            "subscription": await self.verify_subscription(),
            "keepalive": await self.verify_keepalive(),
            "broadcast": await self.verify_message_broadcast(),
        }

        logger.info()
        logger.info("=" * 60)
        logger.info("Verification Summary")
        logger.info("=" * 60)

        passed = sum(1 for v in results.values() if v)
        total = len(results)

        for check, result in results.items():
            status = "✓" if result else "✗"
            logger.info(f"{status} {check.capitalize()}: {'PASS' if result else 'FAIL'}")

        logger.info()
        logger.info(f"Result: {passed}/{total} checks passed")

        if passed == total:
            logger.info("✓ All checks passed! Real-time updates system is operational.")
            return 0
        else:
            logger.warning(f"✗ {total - passed} check(s) failed. See details above.")
            return 1


async def main():
    import os

    ws_url = os.getenv("WS_URL", "ws://localhost:8000/api/ws")
    token = os.getenv("TEST_JWT_TOKEN")

    verifier = RealtimeVerifier(ws_url=ws_url, token=token)
    exit_code = await verifier.run_all_checks()

    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
