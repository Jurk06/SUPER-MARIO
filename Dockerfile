FROM python:3.9-slim
RUN pip install http.server
WORKDIR /app
COPY . /app
EXPOSE 7860
CMD ["python", "-m", "http.server", "7860"]
