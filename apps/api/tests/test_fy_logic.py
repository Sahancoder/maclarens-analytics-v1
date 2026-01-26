"""
Test FY (Fiscal Year) Logic
Tests for Jan-Dec and Apr-Mar edge cases in YTD calculations.
"""
import pytest
from datetime import datetime


# ============ FY HELPER FUNCTIONS (from md_router.py) ============

def get_ytd_months(year: int, current_month: int, fy_start_month: int = 1) -> list:
    """Get YTD months based on fiscal year start"""
    if fy_start_month == 1:
        # Calendar year
        return list(range(1, current_month + 1))
    else:
        # Fiscal year (e.g., April start)
        if current_month >= fy_start_month:
            # Same calendar year
            return list(range(fy_start_month, current_month + 1))
        else:
            # Spans two calendar years
            return list(range(fy_start_month, 13)) + list(range(1, current_month + 1))


def get_fy_year(year: int, month: int, fy_start_month: int = 1) -> int:
    """Get fiscal year for a given date"""
    if fy_start_month == 1:
        return year
    else:
        # For Apr-Mar FY: Jan-Mar 2025 belongs to FY 2024-25
        if month < fy_start_month:
            return year - 1
        else:
            return year


def get_fy_label(fy_year: int, fy_start_month: int = 1) -> str:
    """Get fiscal year label like 'FY 2024-25' for Apr-Mar, or 'FY 2025' for Jan-Dec"""
    if fy_start_month == 1:
        return f"FY {fy_year}"
    else:
        return f"FY {fy_year}-{str(fy_year + 1)[-2:]}"


def is_fy_closed(year: int, month: int, fy_start_month: int, current_date: datetime) -> bool:
    """Check if a fiscal year is closed (complete)"""
    if fy_start_month == 1:
        # Jan-Dec: FY 2024 is closed after Dec 2024
        return year < current_date.year
    else:
        # Apr-Mar: FY 2024-25 is closed after Mar 2025
        fy_end_year = year + 1
        fy_end_month = fy_start_month - 1 if fy_start_month > 1 else 12
        
        if current_date.year > fy_end_year:
            return True
        elif current_date.year == fy_end_year and current_date.month > fy_end_month:
            return True
        return False


# ============ TEST: JAN-DEC FISCAL YEAR ============

class TestJanDecFY:
    """Tests for January-December fiscal year (calendar year)"""
    
    def test_ytd_january(self):
        """YTD in January should only include January"""
        months = get_ytd_months(2025, 1, fy_start_month=1)
        assert months == [1]
    
    def test_ytd_june(self):
        """YTD in June should include Jan through June"""
        months = get_ytd_months(2025, 6, fy_start_month=1)
        assert months == [1, 2, 3, 4, 5, 6]
    
    def test_ytd_december(self):
        """YTD in December should include all 12 months"""
        months = get_ytd_months(2025, 12, fy_start_month=1)
        assert months == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    
    def test_fy_year_january(self):
        """January 2025 belongs to FY 2025"""
        assert get_fy_year(2025, 1, fy_start_month=1) == 2025
    
    def test_fy_year_december(self):
        """December 2025 belongs to FY 2025"""
        assert get_fy_year(2025, 12, fy_start_month=1) == 2025
    
    def test_fy_label(self):
        """FY label for Jan-Dec should be 'FY 2025'"""
        assert get_fy_label(2025, fy_start_month=1) == "FY 2025"
    
    def test_fy_closed_previous_year(self):
        """Previous year should be closed"""
        current = datetime(2025, 3, 15)
        assert is_fy_closed(2024, 6, 1, current) == True
    
    def test_fy_not_closed_current_year(self):
        """Current year should not be closed"""
        current = datetime(2025, 3, 15)
        assert is_fy_closed(2025, 1, 1, current) == False


# ============ TEST: APR-MAR FISCAL YEAR ============

class TestAprMarFY:
    """Tests for April-March fiscal year (common in many countries)"""
    
    def test_ytd_april_first_month(self):
        """YTD in April (start of FY) should only include April"""
        months = get_ytd_months(2025, 4, fy_start_month=4)
        assert months == [4]
    
    def test_ytd_september(self):
        """YTD in September should include Apr through Sep"""
        months = get_ytd_months(2025, 9, fy_start_month=4)
        assert months == [4, 5, 6, 7, 8, 9]
    
    def test_ytd_december(self):
        """YTD in December should include Apr through Dec"""
        months = get_ytd_months(2025, 12, fy_start_month=4)
        assert months == [4, 5, 6, 7, 8, 9, 10, 11, 12]
    
    def test_ytd_january_crosses_year(self):
        """YTD in January crosses calendar year boundary"""
        months = get_ytd_months(2025, 1, fy_start_month=4)
        # Should include Apr-Dec of previous FY (2024) and Jan of current calendar year
        assert months == [4, 5, 6, 7, 8, 9, 10, 11, 12, 1]
    
    def test_ytd_march_full_year(self):
        """YTD in March should be the full fiscal year"""
        months = get_ytd_months(2025, 3, fy_start_month=4)
        assert months == [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    
    def test_fy_year_april(self):
        """April 2025 belongs to FY 2025-26"""
        assert get_fy_year(2025, 4, fy_start_month=4) == 2025
    
    def test_fy_year_january(self):
        """January 2025 belongs to FY 2024-25 (previous FY)"""
        assert get_fy_year(2025, 1, fy_start_month=4) == 2024
    
    def test_fy_year_march(self):
        """March 2025 belongs to FY 2024-25 (previous FY)"""
        assert get_fy_year(2025, 3, fy_start_month=4) == 2024
    
    def test_fy_label_apr_mar(self):
        """FY label for Apr-Mar should be 'FY 2024-25'"""
        assert get_fy_label(2024, fy_start_month=4) == "FY 2024-25"
    
    def test_fy_closed_after_march(self):
        """FY 2024-25 is closed after March 2025"""
        current = datetime(2025, 4, 15)
        assert is_fy_closed(2024, 6, 4, current) == True
    
    def test_fy_not_closed_during_fy(self):
        """FY 2024-25 is not closed during the fiscal year"""
        current = datetime(2025, 2, 15)  # February 2025, still in FY 2024-25
        assert is_fy_closed(2024, 6, 4, current) == False


# ============ TEST: BOUNDARY MONTHS ============

class TestBoundaryMonths:
    """Tests for edge cases at fiscal year boundaries"""
    
    def test_ytd_month_1_jan_dec(self):
        """First month of Jan-Dec FY"""
        assert get_ytd_months(2025, 1, 1) == [1]
    
    def test_ytd_month_12_jan_dec(self):
        """Last month of Jan-Dec FY"""
        assert len(get_ytd_months(2025, 12, 1)) == 12
    
    def test_ytd_month_4_apr_mar(self):
        """First month of Apr-Mar FY"""
        assert get_ytd_months(2025, 4, 4) == [4]
    
    def test_ytd_month_3_apr_mar(self):
        """Last month of Apr-Mar FY (crosses year)"""
        months = get_ytd_months(2025, 3, 4)
        assert len(months) == 12
        assert months[0] == 4  # Starts in April
        assert months[-1] == 3  # Ends in March
    
    def test_year_transition_jan(self):
        """January after Apr-Mar FY crosses calendar year"""
        months = get_ytd_months(2025, 1, 4)
        # Should have 10 months: Apr-Dec (9) + Jan (1)
        assert len(months) == 10
        assert 12 in months  # December included
        assert 1 in months   # January included
    
    def test_year_transition_feb(self):
        """February after Apr-Mar FY"""
        months = get_ytd_months(2025, 2, 4)
        assert len(months) == 11
        assert months == [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]


# ============ TEST: OTHER FISCAL YEARS ============

class TestOtherFYStarts:
    """Tests for other fiscal year start months"""
    
    def test_july_start_fy(self):
        """July-June fiscal year (used in Australia)"""
        # November in FY that started July
        months = get_ytd_months(2025, 11, fy_start_month=7)
        assert months == [7, 8, 9, 10, 11]
    
    def test_july_start_fy_crosses_year(self):
        """July-June FY crossing calendar year"""
        months = get_ytd_months(2025, 4, fy_start_month=7)
        assert months == [7, 8, 9, 10, 11, 12, 1, 2, 3, 4]
    
    def test_october_start_fy(self):
        """October-September fiscal year (US federal)"""
        months = get_ytd_months(2025, 1, fy_start_month=10)
        assert months == [10, 11, 12, 1]
    
    def test_october_full_fy(self):
        """Full October-September fiscal year"""
        months = get_ytd_months(2025, 9, fy_start_month=10)
        assert len(months) == 12


# ============ RUN TESTS ============

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
