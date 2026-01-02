def calculate_heat_index(temp_c, humidity):
    # Convert Celsius → Fahrenheit
    temp_f = temp_c * 9/5 + 32

    # NOAA Rothfusz regression
    HI_F = (
        -42.379
        + 2.04901523 * temp_f
        + 10.14333127 * humidity
        - 0.22475541 * temp_f * humidity
        - 6.83783e-3 * (temp_f ** 2)
        - 5.481717e-2 * (humidity ** 2)
        + 1.22874e-3 * (temp_f ** 2) * humidity
        + 8.5282e-4 * temp_f * (humidity ** 2)
        - 1.99e-6 * (temp_f ** 2) * (humidity ** 2)
    )

    # Convert back to Celsius
    HI_C = round((HI_F - 32) * 5/9)
    return HI_C


def classify_risk(level):
    if level < 27:
        return "Normal"
    elif level < 33:
        return "Caution"
    elif level < 41:
        return "Extreme Caution"
    elif level < 51:
        return "Danger"
    return "Extreme Danger"
