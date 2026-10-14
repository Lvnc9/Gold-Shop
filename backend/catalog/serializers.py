from rest_framework import serializers


class SpotSerializer(serializers.Serializer):
    perGram = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=20, max_value=2000)
    asOf = serializers.DateField()
