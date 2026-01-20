#!/usr/bin/env python3
"""
Backend API Testing for Desideri di Puglia B&B
Tests all API endpoints for the luxury B&B booking system
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any

class DesideriPugliaAPITester:
    def __init__(self, base_url="https://borgo-vecchio-bnb.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def test_health_endpoint(self):
        """Test basic health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                details += f", Response: {response.json()}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            return False

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Error: {str(e)}")
            return False

    def test_get_rooms(self):
        """Test GET /rooms endpoint"""
        try:
            response = requests.get(f"{self.base_url}/rooms", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                rooms = response.json()
                details += f", Found {len(rooms)} rooms"
                
                # Check for expected rooms
                room_names = [room.get('name_it', '') for room in rooms]
                expected_rooms = ['Stanza della Nonna', 'Stanza del Pozzo']
                
                for expected in expected_rooms:
                    if expected in room_names:
                        details += f", Found '{expected}'"
                    else:
                        success = False
                        details += f", Missing '{expected}'"
                
                # Check pricing
                for room in rooms:
                    price = room.get('price_per_night', 0)
                    if price == 80.0:
                        details += f", Correct price €{price}/night"
                    else:
                        details += f", Unexpected price €{price}/night"
                        
            self.log_test("Get Rooms", success, details)
            return success, response.json() if success else []
        except Exception as e:
            self.log_test("Get Rooms", False, f"Error: {str(e)}")
            return False, []

    def test_get_room_detail(self, room_id: str):
        """Test GET /rooms/{room_id} endpoint"""
        try:
            response = requests.get(f"{self.base_url}/rooms/{room_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                room = response.json()
                details += f", Room: {room.get('name_it', 'Unknown')}"
                details += f", Max guests: {room.get('max_guests', 'N/A')}"
                details += f", Images: {len(room.get('images', []))}"
            
            self.log_test(f"Get Room Detail ({room_id})", success, details)
            return success
        except Exception as e:
            self.log_test(f"Get Room Detail ({room_id})", False, f"Error: {str(e)}")
            return False

    def test_get_availability(self, room_id: str):
        """Test GET /availability/{room_id} endpoint"""
        try:
            start_date = datetime.now().strftime('%Y-%m-%d')
            end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            
            response = requests.get(
                f"{self.base_url}/availability/{room_id}?start_date={start_date}&end_date={end_date}",
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                availability = response.json()
                unavailable_count = len(availability.get('unavailable_dates', []))
                details += f", Unavailable dates: {unavailable_count}"
            
            self.log_test(f"Get Availability ({room_id})", success, details)
            return success
        except Exception as e:
            self.log_test(f"Get Availability ({room_id})", False, f"Error: {str(e)}")
            return False

    def test_create_booking(self, room_id: str):
        """Test POST /bookings endpoint"""
        try:
            check_in = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
            check_out = (datetime.now() + timedelta(days=9)).strftime('%Y-%m-%d')
            
            booking_data = {
                "room_id": room_id,
                "guest_name": "Test Guest",
                "guest_email": "test@example.com",
                "guest_phone": "+39 123 456 7890",
                "check_in": check_in,
                "check_out": check_out,
                "num_guests": 2,
                "notes": "Test booking",
                "origin_url": "https://borgo-vecchio-bnb.preview.emergentagent.com"
            }
            
            response = requests.post(
                f"{self.base_url}/bookings",
                json=booking_data,
                timeout=15
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                booking = response.json()
                details += f", Booking ID: {booking.get('booking_id', 'N/A')}"
                details += f", Total: €{booking.get('total_price', 'N/A')}"
                details += f", Nights: {booking.get('nights', 'N/A')}"
                if booking.get('checkout_url'):
                    details += ", Stripe checkout URL created"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Raw response: {response.text[:100]}"
            
            self.log_test("Create Booking", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Create Booking", False, f"Error: {str(e)}")
            return False, {}

    def test_get_reviews(self):
        """Test GET /reviews endpoint"""
        try:
            response = requests.get(f"{self.base_url}/reviews?approved_only=true", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                reviews = response.json()
                details += f", Found {len(reviews)} reviews"
            
            self.log_test("Get Reviews", success, details)
            return success
        except Exception as e:
            self.log_test("Get Reviews", False, f"Error: {str(e)}")
            return False

    def test_contact_submission(self):
        """Test POST /contact endpoint"""
        try:
            contact_data = {
                "name": "Test User",
                "email": "test@example.com",
                "message": "Test message from API testing",
                "language": "it"
            }
            
            response = requests.post(
                f"{self.base_url}/contact",
                json=contact_data,
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                result = response.json()
                details += f", Message: {result.get('message', 'N/A')}"
            
            self.log_test("Contact Submission", success, details)
            return success
        except Exception as e:
            self.log_test("Contact Submission", False, f"Error: {str(e)}")
            return False

    def test_settings_endpoint(self):
        """Test GET /settings endpoint"""
        try:
            response = requests.get(f"{self.base_url}/settings", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                settings = response.json()
                details += f", Check-in: {settings.get('check_in_time', 'N/A')}"
                details += f", Check-out: {settings.get('check_out_time', 'N/A')}"
            
            self.log_test("Get Settings", success, details)
            return success
        except Exception as e:
            self.log_test("Get Settings", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🏨 Testing Desideri di Puglia B&B API")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity tests
        if not self.test_health_endpoint():
            print("❌ Health check failed - stopping tests")
            return False
            
        self.test_root_endpoint()
        
        # Room tests
        rooms_success, rooms_data = self.test_get_rooms()
        if rooms_success and rooms_data:
            # Test individual room details
            for room in rooms_data[:2]:  # Test first 2 rooms
                room_id = room.get('id')
                if room_id:
                    self.test_get_room_detail(room_id)
                    self.test_get_availability(room_id)
            
            # Test booking with first room
            if rooms_data:
                first_room_id = rooms_data[0].get('id')
                if first_room_id:
                    self.test_create_booking(first_room_id)
        
        # Other endpoint tests
        self.test_get_reviews()
        self.test_contact_submission()
        self.test_settings_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        if success_rate < 70:
            print("⚠️  Warning: Low success rate - check backend logs")
            return False
        elif success_rate < 90:
            print("⚠️  Some tests failed - review details above")
            return False
        else:
            print("🎉 All critical tests passed!")
            return True

def main():
    """Main test execution"""
    tester = DesideriPugliaAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())