FROM python:3.12-slim

WORKDIR /app

# Install Swiss Ephemeris data
RUN mkdir -p /usr/share/ephe && \
    apt-get update && apt-get install -y --no-install-recommends wget && \
    wget -q -P /usr/share/ephe \
      https://www.astro.com/ftp/swisseph/ephe/seas_18.se1 \
      https://www.astro.com/ftp/swisseph/ephe/semo_18.se1 \
      https://www.astro.com/ftp/swisseph/ephe/sepl_18.se1 && \
    apt-get purge -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
