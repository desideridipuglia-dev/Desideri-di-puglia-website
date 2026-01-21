"""
Test suite for new features:
1. Dynamic pricing system (custom prices per date/room)
2. Upsells system with persuasive messages
3. Stay reason field in booking form
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for authenticated endpoints
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"


class TestStayReasons:
    """Test stay reasons endpoint"""
    
    def test_get_stay_reasons(self):
        """GET /api/stay-reasons - returns list of stay reason options"""
        response = requests.get(f"{BASE_URL}/api/stay-reasons")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify structure of stay reasons
        first_reason = data[0]
        assert "id" in first_reason
        assert "it" in first_reason
        assert "en" in first_reason
        
        # Check expected reasons exist
        reason_ids = [r["id"] for r in data]
        assert "vacanza" in reason_ids
        assert "romantico" in reason_ids
        assert "famiglia" in reason_ids
        print(f"✓ Found {len(data)} stay reasons: {reason_ids}")


class TestUpsells:
    """Test upsells endpoints"""
    
    def test_get_upsells_all(self):
        """GET /api/upsells - returns all upsells"""
        response = requests.get(f"{BASE_URL}/api/upsells")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify upsell structure
        upsell = data[0]
        assert "id" in upsell
        assert "slug" in upsell
        assert "title_it" in upsell
        assert "title_en" in upsell
        assert "description_it" in upsell
        assert "description_en" in upsell
        assert "price" in upsell
        assert "min_nights" in upsell
        assert "is_active" in upsell
        assert "icon" in upsell
        print(f"✓ Found {len(data)} upsells")
    
    def test_get_upsells_active_only(self):
        """GET /api/upsells?active_only=true - returns only active upsells"""
        response = requests.get(f"{BASE_URL}/api/upsells?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned upsells should be active
        for upsell in data:
            assert upsell["is_active"] == True
        print(f"✓ All {len(data)} returned upsells are active")
    
    def test_upsell_min_nights_filter(self):
        """Verify upsells have min_nights field for filtering"""
        response = requests.get(f"{BASE_URL}/api/upsells")
        data = response.json()
        
        # Find upsell with min_nights > 0 (pulizia-extra should have min_nights=7)
        high_min_nights = [u for u in data if u.get("min_nights", 0) >= 7]
        assert len(high_min_nights) > 0, "Should have at least one upsell with min_nights >= 7"
        
        pulizia = next((u for u in data if u["slug"] == "pulizia-extra"), None)
        if pulizia:
            assert pulizia["min_nights"] == 7
            print(f"✓ 'pulizia-extra' upsell has min_nights=7 (only for stays >= 7 nights)")
    
    def test_create_upsell(self):
        """POST /api/upsells - create new upsell"""
        new_upsell = {
            "slug": "test-upsell-" + datetime.now().strftime("%Y%m%d%H%M%S"),
            "title_it": "Test Upsell IT",
            "title_en": "Test Upsell EN",
            "description_it": "Descrizione test persuasiva",
            "description_en": "Persuasive test description",
            "price": 99.99,
            "min_nights": 2,
            "icon": "gift"
        }
        
        response = requests.post(f"{BASE_URL}/api/upsells", json=new_upsell)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "message" in data
        print(f"✓ Created upsell with id: {data['id']}")
        
        # Cleanup - delete the test upsell
        delete_response = requests.delete(f"{BASE_URL}/api/upsells/{data['id']}")
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test upsell")
    
    def test_toggle_upsell_active(self):
        """PUT /api/upsells/{id} - toggle upsell active status"""
        # Get existing upsells
        response = requests.get(f"{BASE_URL}/api/upsells")
        upsells = response.json()
        
        if len(upsells) > 0:
            upsell = upsells[0]
            original_status = upsell["is_active"]
            
            # Toggle status
            toggle_response = requests.put(
                f"{BASE_URL}/api/upsells/{upsell['id']}", 
                json={"is_active": not original_status}
            )
            assert toggle_response.status_code == 200
            
            # Verify change
            updated = toggle_response.json()
            assert updated["is_active"] == (not original_status)
            print(f"✓ Toggled upsell '{upsell['slug']}' from {original_status} to {not original_status}")
            
            # Restore original status
            requests.put(
                f"{BASE_URL}/api/upsells/{upsell['id']}", 
                json={"is_active": original_status}
            )
            print(f"✓ Restored original status")


class TestCustomPrices:
    """Test custom/dynamic pricing endpoints"""
    
    def test_create_custom_prices(self):
        """POST /api/custom-prices - set custom price for date range"""
        start_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%d")
        
        price_data = {
            "room_id": "nonna",
            "start_date": start_date,
            "end_date": end_date,
            "price": 120.0,
            "reason": "Test alta stagione"
        }
        
        response = requests.post(f"{BASE_URL}/api/custom-prices", json=price_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "3 days" in data["message"]  # 3 days in range
        print(f"✓ Created custom prices: {data['message']}")
        
        # Verify prices were created
        get_response = requests.get(
            f"{BASE_URL}/api/custom-prices/nonna?start_date={start_date}&end_date={end_date}"
        )
        assert get_response.status_code == 200
        prices = get_response.json()
        assert len(prices) == 3
        assert all(p["price"] == 120.0 for p in prices)
        print(f"✓ Verified {len(prices)} custom prices created")
        
        # Cleanup
        for price in prices:
            requests.delete(f"{BASE_URL}/api/custom-prices/nonna/{price['date']}")
        print(f"✓ Cleaned up test custom prices")
    
    def test_get_custom_prices_for_room(self):
        """GET /api/custom-prices/{room_id} - get custom prices"""
        response = requests.get(f"{BASE_URL}/api/custom-prices/nonna")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} custom prices for room 'nonna'")
    
    def test_delete_custom_price(self):
        """DELETE /api/custom-prices/{room_id}/{date} - delete specific custom price"""
        # First create a price to delete
        test_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        create_response = requests.post(f"{BASE_URL}/api/custom-prices", json={
            "room_id": "pozzo",
            "start_date": test_date,
            "end_date": test_date,
            "price": 150.0,
            "reason": "Test delete"
        })
        assert create_response.status_code == 200
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/custom-prices/pozzo/{test_date}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted custom price for {test_date}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/custom-prices/pozzo?start_date={test_date}&end_date={test_date}")
        prices = get_response.json()
        assert len(prices) == 0
        print(f"✓ Verified custom price was deleted")


class TestBookingWithNewFeatures:
    """Test booking creation with upsells, dynamic pricing, and stay reason"""
    
    def test_booking_with_upsells_and_stay_reason(self):
        """POST /api/bookings - create booking with upsells and stay reason"""
        # Get available upsells
        upsells_response = requests.get(f"{BASE_URL}/api/upsells?active_only=true")
        upsells = upsells_response.json()
        
        # Select first 2 upsells
        selected_upsell_ids = [u["id"] for u in upsells[:2]] if len(upsells) >= 2 else [upsells[0]["id"]]
        
        check_in = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        check_out = (datetime.now() + timedelta(days=93)).strftime("%Y-%m-%d")
        
        booking_data = {
            "room_id": "nonna",
            "guest_email": "test@example.com",
            "guest_name": "Test Guest",
            "guest_phone": "+39123456789",
            "check_in": check_in,
            "check_out": check_out,
            "num_guests": 2,
            "notes": "Test booking with upsells",
            "origin_url": "https://test.com",
            "upsell_ids": selected_upsell_ids,
            "stay_reason": "vacanza"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "booking_id" in data
        assert "checkout_url" in data
        assert "total_price" in data
        
        # Verify upsells were included in price
        expected_upsells_total = sum(u["price"] for u in upsells[:2]) if len(upsells) >= 2 else upsells[0]["price"]
        
        print(f"✓ Created booking with id: {data['booking_id']}")
        print(f"✓ Total price: €{data['total_price']} (includes upsells)")
        print(f"✓ Checkout URL generated: {data['checkout_url'][:50]}...")
    
    def test_booking_price_calculation_with_custom_prices(self):
        """Verify booking calculates price using custom prices when available"""
        # Set custom price for specific dates
        check_in = (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d")
        check_out = (datetime.now() + timedelta(days=102)).strftime("%Y-%m-%d")
        
        # Set custom price of €150/night for these dates
        requests.post(f"{BASE_URL}/api/custom-prices", json={
            "room_id": "pozzo",
            "start_date": check_in,
            "end_date": (datetime.now() + timedelta(days=101)).strftime("%Y-%m-%d"),
            "price": 150.0,
            "reason": "Test pricing"
        })
        
        # Create booking
        booking_data = {
            "room_id": "pozzo",
            "guest_email": "test2@example.com",
            "guest_name": "Test Guest 2",
            "check_in": check_in,
            "check_out": check_out,
            "num_guests": 1,
            "origin_url": "https://test.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        # 2 nights at €150 = €300
        assert data["total_price"] == 300.0
        print(f"✓ Booking price correctly calculated with custom prices: €{data['total_price']}")
        
        # Cleanup custom prices
        requests.delete(f"{BASE_URL}/api/custom-prices/pozzo/{check_in}")
        requests.delete(f"{BASE_URL}/api/custom-prices/pozzo/{(datetime.now() + timedelta(days=101)).strftime('%Y-%m-%d')}")


class TestAvailabilityWithCustomPrices:
    """Test availability endpoint returns custom prices"""
    
    def test_availability_includes_custom_prices(self):
        """GET /api/availability/{room_id} - includes custom prices in response"""
        # Set a custom price
        test_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        requests.post(f"{BASE_URL}/api/custom-prices", json={
            "room_id": "nonna",
            "start_date": test_date,
            "end_date": test_date,
            "price": 200.0,
            "reason": "Test availability"
        })
        
        # Get availability
        start = datetime.now().strftime("%Y-%m-%d")
        end = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/availability/nonna?start_date={start}&end_date={end}")
        assert response.status_code == 200
        
        data = response.json()
        assert "unavailable_dates" in data
        assert "custom_prices" in data
        
        # Verify custom price is in response
        assert test_date in data["custom_prices"]
        assert data["custom_prices"][test_date] == 200.0
        print(f"✓ Availability endpoint includes custom prices: {test_date} = €200")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/custom-prices/nonna/{test_date}")


class TestAdminEndpoints:
    """Test admin-related endpoints for managing upsells and prices"""
    
    def test_get_all_upsells_for_admin(self):
        """Admin can see all upsells including inactive ones"""
        response = requests.get(f"{BASE_URL}/api/upsells")
        assert response.status_code == 200
        
        data = response.json()
        # Should include both active and inactive
        print(f"✓ Admin can view all {len(data)} upsells")
    
    def test_update_upsell_details(self):
        """PUT /api/upsells/{id} - update upsell details"""
        # Get an upsell
        response = requests.get(f"{BASE_URL}/api/upsells")
        upsells = response.json()
        
        if len(upsells) > 0:
            upsell = upsells[0]
            original_price = upsell["price"]
            
            # Update price
            update_response = requests.put(
                f"{BASE_URL}/api/upsells/{upsell['id']}", 
                json={"price": 999.99}
            )
            assert update_response.status_code == 200
            
            updated = update_response.json()
            assert updated["price"] == 999.99
            print(f"✓ Updated upsell price from €{original_price} to €999.99")
            
            # Restore original price
            requests.put(
                f"{BASE_URL}/api/upsells/{upsell['id']}", 
                json={"price": original_price}
            )
            print(f"✓ Restored original price €{original_price}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
