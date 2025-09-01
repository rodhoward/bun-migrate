update
    accounts
set
    name = 'updated'
where
    name like '%site%';

insert into
    accounts (id, name)
values
    (2, 'another one');