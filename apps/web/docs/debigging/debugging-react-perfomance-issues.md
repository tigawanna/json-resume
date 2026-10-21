# Debugging React perfomance issues

While building my AI powered resume building app I ran into an intersting scenario where on some runs the the chat app would freeze and it would seem like the response isn't coming through and the chat app is stuck

I had already done some optimizations around how i picked the openrouter models as the naive approach was leading to chats that end abruptly or get back low quality outputs where the same model feels dumber across requetsts and the TLDR was that OpenRouter would route your requets to the cheapest model provider of the specific model you picked resulting in your requetss being routed to modles thaat are configured with lower context windows, overly quantized or with tool calls diasabled and the fix forthis is to pick not only a model but also a provider with the official modle roviders being soe of the better options
