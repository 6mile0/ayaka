FROM lscr.io/linuxserver/code-server:latest
SHELL ["/bin/bash", "-c"]
RUN apt-get update && apt-get upgrade -y
# Python3
RUN apt-get install python3 python3-pip -y
# C++
RUN apt-get install build-essential -y
# NodeJS
RUN curl -sL https://deb.nodesource.com/setup_19.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn
# Java
RUN apt-get install default-jdk -y
# Go
RUN apt-get install golang -y
# C#
RUN apt-get install mono-complete -y
# Haskell
RUN apt-get install haskell-platform -y
# Ruby
RUN apt-get install ruby-full -y
# PHP
RUN apt-get install php -y
# Rust
ENV RUST_HOME /usr/local/lib/rust
ENV RUSTUP_HOME ${RUST_HOME}/rustup
ENV CARGO_HOME ${RUST_HOME}/cargo
RUN mkdir /usr/local/lib/rust && \
    chmod 0755 $RUST_HOME
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs > ${RUST_HOME}/rustup.sh \
    && chmod +x ${RUST_HOME}/rustup.sh \
    && ${RUST_HOME}/rustup.sh -y --default-toolchain nightly --no-modify-path
ENV PATH $PATH:$CARGO_HOME/bin