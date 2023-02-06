create table ayaka.users(
    user_id varchar(20) not null,
    container_id char(16) not null primary key,
    container_name text not null,
    editor_password char(20) not null,
    sudo_password char(32) not null,
    available_ports varchar(80) not null,
    created_at bigint not null,
    expired_at bigint not null,
    interval_id int not null,
    delete_flag bit not null
);