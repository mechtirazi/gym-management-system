# Stage 1: Build Angular application
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve application with Nginx
FROM nginx:alpine

# Install bash and gettext (for envsubst to substitute $PORT in nginx.conf)
RUN apk add --no-cache bash gettext

COPY --from=build /app/dist/gym-ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script that injects the API URL at runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
