# Stage 1: Build Angular application
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve with Nginx — Railway compatible
FROM nginx:alpine
RUN apk add --no-cache bash gettext

# Copy built app
COPY --from=build /app/dist/gym-ui/browser /usr/share/nginx/html

# Copy entrypoint that injects API_URL and PORT at runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# nginx config template — uses $PORT variable
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
